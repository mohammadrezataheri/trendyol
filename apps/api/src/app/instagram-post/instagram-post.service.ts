import { Injectable, NotAcceptableException, BadRequestException, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import InstagramAccount from "./entity/instagram.entity";
import { InjectRepository } from "@nestjs/typeorm";
import CreateAuthConfigDto from "./dto/create-auth-config.dto";
import InitiateLoginDto from "./dto/initiate-login.dto";
import SyncAccountDto from "./dto/sync-account.dto";
import AuthConfig from "./entity/auth-config.entity";
import { firstValueFrom } from "rxjs";
import { RoleName } from "../auth/entity/role.entity";
import { IGetUser } from "src/shared/decorators/get-user.decorator";
import SearchBaseDto from "src/shared/global/dto/searchBase.dto";




@Injectable()
export class InstagramPostService {
  private readonly composioApiKey: string;
  private readonly composioBaseUrl: string = "https://backend.composio.dev/api/v3";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(InstagramAccount)
    private readonly instagramAccountRepository: Repository<InstagramAccount>,
    @InjectRepository(AuthConfig)
    private readonly authConfigRepository: Repository<AuthConfig>
  ) {
    this.composioApiKey = this.configService.get<string>("COMPOSIO_API_KEY") || "";
    if (!this.composioApiKey) {
      throw new Error("COMPOSIO_API_KEY is not configured in environment variables");
    }
  }

  async accountList(userReq: IGetUser, SearchBaseDto: SearchBaseDto) {
    // بررسی می‌کنیم که آیا کاربر نقش ADMIN دارد یا نه
    const isAdmin = userReq?.email === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }

    const skip = SearchBaseDto.skip || 0;
    const take = SearchBaseDto.take || 10;

    // دریافت لیست اکانت‌های اینستاگرام از دیتابیس با relation authConfig
    // استفاده از query builder با getRawMany
    const baseQueryBuilder = this.instagramAccountRepository
      .createQueryBuilder('account')
      .leftJoin('account.authConfig', 'authConfig');

    // گرفتن count قبل از skip/take
    const total = await baseQueryBuilder.getCount();

    // اضافه کردن select, order, skip, take برای داده‌ها
    const queryBuilder = baseQueryBuilder
      .select([
        'account.id',
        'account.connectedAccountId',
        'account.username',
        'account.userId',
        'account.authConfigId',
        'account.instagramId',
        'account.accountType',
        'account.biography',
        'account.followersCount',
        'account.followsCount',
        'account.mediaCount',
        'account.profilePictureUrl',
        'account.website',
        'account.status',
        'account.createdAt', 
        'account.updatedAt',
        'authConfig.id',
        'authConfig.authConfigId',
        'authConfig.toolkit',
        'authConfig.authScheme',
        'authConfig.clientId',
        'authConfig.scopes',
        'authConfig.redirectUrl',
        'authConfig.createdBy',
        'authConfig.createdAt',
        'authConfig.updatedAt',
      ])
      .orderBy('account.id', 'DESC')
      .skip(skip)
      .take(take);
    
    // گرفتن داده‌ها با getRawMany
    const accounts = await queryBuilder.getRawMany();

    // تبدیل داده‌های raw به فرمت مناسب برای نمایش
    // getRawMany داده‌ها را با prefix alias برمی‌گرداند (مثلاً account_id, authConfig_id)
    const formattedData = accounts.map((account) => ({
      // اطلاعات InstagramAccount
      id: account.account_id,
      connectedAccountId: account.account_connectedAccountId,
      username: account.account_username,
      userId: account.account_userId,
      instagramId: account.account_instagramId,
      accountType: account.account_accountType,
      biography: account.account_biography,
      followersCount: account.account_followersCount,
      followsCount: account.account_followsCount,
      mediaCount: account.account_mediaCount,
      profilePictureUrl: account.account_profilePictureUrl,
      website: account.account_website,
      status: account.account_status,
      createdAt: account.account_createdAt,
      updatedAt: account.account_updatedAt,
      // اطلاعات AuthConfig مرتبط
      authConfig: account.authConfig_id
        ? {
            id: account.authConfig_id,
            authConfigId: account.authConfig_authConfigId,
            toolkit: account.authConfig_toolkit,
            authScheme: account.authConfig_authScheme,
            clientId: account.authConfig_clientId,
            scopes: account.authConfig_scopes,
            redirectUrl: account.authConfig_redirectUrl,
            createdBy: account.authConfig_createdBy,
            createdAt: account.authConfig_createdAt,
            updatedAt: account.authConfig_updatedAt,
          }
        : null,
    }));

    return {
      data: formattedData,
      total,
      skip,
      take,
    };
  }


  /**
   * Initiate Instagram login flow via Composio
   * این متد یک URL برای لاگین اینستاگرام برمی‌گرداند
   */
  async initiateLogin(userReq: IGetUser, initiateLoginDto: InitiateLoginDto) {
    // بررسی می‌کنیم که آیا کاربر نقش ADMIN دارد یا نه
    const isAdmin = userReq?.email === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }

    try {
      // درخواست اول: ایجاد auth config در Composio
      const authConfigResponse = await firstValueFrom(
        this.httpService.post(
          `${this.composioBaseUrl}/auth_configs`,
          {
            toolkit: {
              slug: "instagram"
            }
          },
          {
            headers: {
              "x-api-key": this.composioApiKey,
              "Content-Type": "application/json",
            },
          }
        )
      );

      const authConfigId = authConfigResponse.data?.auth_config?.id;

      if (!authConfigId) {
        throw new BadRequestException("پاسخ نامعتبر از Composio API - auth_config.id یافت نشد");
      }

      // درخواست دوم: ایجاد connected account link
      const linkResponse = await firstValueFrom(
        this.httpService.post(
          `${this.composioBaseUrl}/connected_accounts/link`,
          {
            auth_config_id: authConfigId,
            user_id: userReq.id
          },
          {
            headers: {
              "x-api-key": this.composioApiKey,
              "Content-Type": "application/json",
            },
          }
        )
      );

      const redirectUrl = linkResponse.data?.redirect_url;
      const connectedAccountId = linkResponse.data?.connected_account_id;

      if (!redirectUrl) {
        throw new BadRequestException("پاسخ نامعتبر از Composio API - redirect_url یافت نشد");
      }

      if (!connectedAccountId) {
        throw new BadRequestException("پاسخ نامعتبر از Composio API - connected_account_id یافت نشد");
      }

      // درخواست سوم: دریافت اطلاعات connected account با استفاده از connected_account_id
      const connectedAccountResponse = await firstValueFrom(
        this.httpService.get(
          `${this.composioBaseUrl}/connected_accounts/${connectedAccountId}`,
          {
            headers: {
              "x-api-key": this.composioApiKey,
            },
          }
        )
      );

      const connectedAccountData = connectedAccountResponse.data;

      if (connectedAccountData) {
        // ایجاد رکورد در AuthConfig
        const existingAuthConfig = await this.authConfigRepository.findOne({
          where: { authConfigId: authConfigId },
        });

        if (!existingAuthConfig) {
          await this.authConfigRepository.save({
            authConfigId: authConfigId,
            toolkit: connectedAccountData.toolkit?.slug || "instagram",
            authScheme: connectedAccountData.auth_config?.auth_scheme || "OAUTH2",
            clientId: null, // این فیلدها در response نیستند
            clientSecret: null,
            scopes: [],
            redirectUrl: redirectUrl,
            createdBy: userReq.id,
          });
        }

        // ایجاد رکورد در InstagramAccount
        const existingInstagramAccount = await this.instagramAccountRepository.findOne({
          where: { connectedAccountId: connectedAccountId },
        });

        if (!existingInstagramAccount) {
          // پیدا کردن authConfig (یا موجود یا تازه ایجاد شده)
          const authConfigToUse = existingAuthConfig || await this.authConfigRepository.findOne({
            where: { authConfigId: authConfigId },
          });

          // استخراج username از data اگر موجود باشد
          // می‌توانیم از test_request_endpoint استفاده کنیم یا از data.username
          const username = connectedAccountData.data?.username || null;

          await this.instagramAccountRepository.save({
            connectedAccountId: connectedAccountId,
            username: username,
            userId: userReq.id,
            authConfig: authConfigToUse, // تنظیم رابطه با authConfig
          });
        }
      }

      return {
        redirect_url: redirectUrl
      };
    } catch (error) {
      console.error("Error initiating login:", error?.response?.data || error?.message);
      throw new BadRequestException(
        error?.response?.data?.message || 
        error?.message || 
        "خطا در ایجاد لینک لاگین اینستاگرام"
      );
    }
  }

  /**
   * Sync Instagram account information from Composio
   * این متد اطلاعات اکانت اینستاگرام را از Composio دریافت کرده و در دیتابیس به‌روزرسانی می‌کند
   */
  async syncAccount(userReq: IGetUser, syncAccountDto: SyncAccountDto) {
    // بررسی می‌کنیم که آیا کاربر نقش ADMIN دارد یا نه
    const isAdmin = userReq?.email === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }

    const { connectedAccountId } = syncAccountDto;

    try {
      // درخواست اول: دریافت اطلاعات connected account از Composio
      const connectedAccountResponse = await firstValueFrom(
        this.httpService.get(
          `${this.composioBaseUrl}/connected_accounts/${connectedAccountId}`,
          {
            headers: {
              "x-api-key": this.composioApiKey,
            },
          }
        )
      );

      const connectedAccountData = connectedAccountResponse.data;

      if (!connectedAccountData) {
        throw new NotFoundException("Connected account یافت نشد");
      }

      const authConfigId = connectedAccountData.auth_config?.id;

      if (!authConfigId) {
        throw new BadRequestException("auth_config.id در response یافت نشد");
      }

      // درخواست دوم: دریافت اطلاعات کاربر اینستاگرام
      const userInfoResponse = await firstValueFrom(
        this.httpService.post(
          `${this.composioBaseUrl}/tools/execute/INSTAGRAM_GET_USER_INFO`,
          {
            connected_account_id: connectedAccountId,
            arguments: {},
          },
          {
            headers: {
              "x-api-key": this.composioApiKey,
              "Content-Type": "application/json",
            },
          }
        )
      );

      const userInfoData = userInfoResponse.data?.data;

      if (!userInfoData) {
        throw new BadRequestException("اطلاعات کاربر اینستاگرام یافت نشد");
      }

      // پیدا کردن authConfig
      const authConfig = await this.authConfigRepository.findOne({
        where: { authConfigId: authConfigId },
      });

      if (!authConfig) {
        throw new NotFoundException("AuthConfig با این authConfigId یافت نشد");
      }

      // پیدا کردن یا ایجاد رکورد InstagramAccount
      let instagramAccount = await this.instagramAccountRepository.findOne({
        where: { connectedAccountId: connectedAccountId },
      });

      if (instagramAccount) {
        // به‌روزرسانی رکورد موجود
        instagramAccount.username = userInfoData.username || instagramAccount.username;
        instagramAccount.instagramId = userInfoData.id;
        instagramAccount.accountType = userInfoData.account_type;
        instagramAccount.biography = userInfoData.biography;
        instagramAccount.followersCount = userInfoData.followers_count;
        instagramAccount.followsCount = userInfoData.follows_count;
        instagramAccount.mediaCount = userInfoData.media_count;
        instagramAccount.profilePictureUrl = userInfoData.profile_picture_url;
        instagramAccount.website = userInfoData.website;
        instagramAccount.status = connectedAccountData.status;
        instagramAccount.authConfig = authConfig;

        await this.instagramAccountRepository.save(instagramAccount);
      } else {
        // ایجاد رکورد جدید
        instagramAccount = await this.instagramAccountRepository.save({
          connectedAccountId: connectedAccountId,
          username: userInfoData.username,
          userId: userReq.id,
          instagramId: userInfoData.id,
          accountType: userInfoData.account_type,
          biography: userInfoData.biography,
          followersCount: userInfoData.followers_count,
          followsCount: userInfoData.follows_count,
          mediaCount: userInfoData.media_count,
          profilePictureUrl: userInfoData.profile_picture_url,
          website: userInfoData.website,
          status: connectedAccountData.status,
          authConfig: authConfig,
        });
      }

      return {
        success: true,
        message: "اطلاعات اکانت اینستاگرام با موفقیت همگام‌سازی شد",
        data: {
          id: instagramAccount.id,
          connectedAccountId: instagramAccount.connectedAccountId,
          username: instagramAccount.username,
          instagramId: instagramAccount.instagramId,
          accountType: instagramAccount.accountType,
          biography: instagramAccount.biography,
          followersCount: instagramAccount.followersCount,
          followsCount: instagramAccount.followsCount,
          mediaCount: instagramAccount.mediaCount,
          profilePictureUrl: instagramAccount.profilePictureUrl,
          website: instagramAccount.website,
          status: instagramAccount.status,
        },
      };
    } catch (error) {
      console.error("Error syncing account:", error?.response?.data || error?.message);
      throw new BadRequestException(
        error?.response?.data?.message || 
        error?.message || 
        "خطا در همگام‌سازی اطلاعات اکانت اینستاگرام"
      );
    }
  }

}