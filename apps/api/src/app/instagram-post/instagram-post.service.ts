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

console.log("userReq", userReq);
console.log("SearchBaseDto", SearchBaseDto);

    // بررسی می‌کنیم که آیا کاربر نقش ADMIN دارد یا نه
    const isAdmin = userReq?.email === process.env.ADMIN_EMAIL;

    if (!isAdmin) {
      throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }


    
    // دریافت لیست اکانت‌های اینستاگرام از دیتابیس
    const accounts = await this.instagramAccountRepository.find({
      order: {
        createdAt: "DESC",
      },
    });

    return {
      data: accounts,
      total: accounts.length,
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