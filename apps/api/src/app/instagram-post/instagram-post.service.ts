import { Injectable, NotAcceptableException, BadRequestException, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import InstagramAccount from "./entity/instagram.entity";
import { InjectRepository } from "@nestjs/typeorm";
import CreateAuthConfigDto from "./dto/create-auth-config.dto";
import InitiateLoginDto from "./dto/initiate-login.dto";
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
    // استفاده از query builder برای اطمینان از انتخاب صحیح فیلدها
    const queryBuilder = this.instagramAccountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.authConfig', 'authConfig')
      .orderBy('account.id', 'DESC')
      .skip(skip)
      .take(take);

    const [accounts, total] = await queryBuilder.getManyAndCount();

    // تبدیل داده‌ها به فرمت مناسب برای نمایش
    const formattedData = accounts.map((account) => ({
      // اطلاعات InstagramAccount
      id: account.id,
      connectedAccountId: account.connectedAccountId,
      username: account.username,
      userId: account.userId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      // اطلاعات AuthConfig مرتبط
      authConfig: account.authConfig
        ? {
            id: account.authConfig.id,
            authConfigId: account.authConfig.authConfigId,
            toolkit: account.authConfig.toolkit,
            authScheme: account.authConfig.authScheme,
            clientId: account.authConfig.clientId,
            scopes: account.authConfig.scopes,
            redirectUrl: account.authConfig.redirectUrl,
            createdBy: account.authConfig.createdBy,
            createdAt: account.authConfig.createdAt,
            updatedAt: account.authConfig.updatedAt,
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
   * Get list of auth configs
   */
    async getAuthConfigs(userReq: IGetUser, searchBaseDto: SearchBaseDto) {
    // بررسی می‌کنیم که آیا کاربر نقش ADMIN دارد یا نه
    const isAdmin = userReq?.email === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }

    const skip = searchBaseDto.skip || 0;
    const take = searchBaseDto.take || 10;

    const [authConfigs, total] = await this.authConfigRepository.findAndCount({
      skip,
      take,
      order: {
        createdBy: "DESC",
      },
    });

    return {
      data: authConfigs.map((config) => ({
        id: config.id,
        authConfigId: config.authConfigId,
        toolkit: config.toolkit,
        authScheme: config.authScheme,
        scopes: config.scopes,
        redirectUrl: config.redirectUrl,
        createdBy: config.createdBy,
      })),
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

      if (!redirectUrl) {
        throw new BadRequestException("پاسخ نامعتبر از Composio API - redirect_url یافت نشد");
      }

      // درخواست سوم: دریافت لیست connected accounts
      const connectedAccountsResponse = await firstValueFrom(
        this.httpService.get(
          `${this.composioBaseUrl}/connected_accounts`,
          {
            headers: {
              "x-api-key": this.composioApiKey,
            },
          }
        )
      );

      const items = connectedAccountsResponse.data?.items || [];
      
      // پیدا کردن آیتمی که auth_config.id آن با authConfigId مطابقت دارد
      const matchedItem = items.find(
        (item: any) => item.auth_config?.id === authConfigId
      );

      if (matchedItem) {
        // ایجاد رکورد در AuthConfig
        const existingAuthConfig = await this.authConfigRepository.findOne({
          where: { authConfigId: authConfigId },
        });

        if (!existingAuthConfig) {
          await this.authConfigRepository.save({
            authConfigId: authConfigId,
            toolkit: matchedItem.toolkit?.slug || "instagram",
            authScheme: matchedItem.auth_config?.auth_scheme || matchedItem.authScheme || "OAUTH2",
            clientId: null, // این فیلدها در response نیستند
            clientSecret: null,
            scopes: [],
            redirectUrl: redirectUrl,
            createdBy: userReq.id,
          });
        }

        // ایجاد رکورد در InstagramAccount
        const connectedAccountId = matchedItem.id;
        const existingInstagramAccount = await this.instagramAccountRepository.findOne({
          where: { connectedAccountId: connectedAccountId },
        });

        if (!existingInstagramAccount) {
          // پیدا کردن authConfig (یا موجود یا تازه ایجاد شده)
          const authConfigToUse = existingAuthConfig || await this.authConfigRepository.findOne({
            where: { authConfigId: authConfigId },
          });

          await this.instagramAccountRepository.save({
            connectedAccountId: connectedAccountId,
            username: null, // nullable
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

}