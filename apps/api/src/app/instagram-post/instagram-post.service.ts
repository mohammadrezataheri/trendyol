import { Injectable, NotAcceptableException, BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import InstagramAccount from "./entity/instagram.entity";
import { InjectRepository } from "@nestjs/typeorm";
import CreateAuthConfigDto from "./dto/create-auth-config.dto";
import AuthConfig from "./entity/auth-config.entity";
import { firstValueFrom } from "rxjs";




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

  async accountList(userReq: any, SearchBaseDto: any) {

    const { isSuperAdmin } = userReq;

    if (!isSuperAdmin) {
        throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }



  }

  /**
   * Create auth config in Composio for Instagram toolkit
   */
  async createAuthConfig(
    userReq: any,
    createAuthConfigDto: CreateAuthConfigDto
  ) {
    const { isSuperAdmin, id: userId } = userReq;

    if (!isSuperAdmin) {
      throw new NotAcceptableException("شما سطح دسترسی به این بخش را ندارید");
    }

    const { clientId, clientSecret, scopes, redirectUrl } = createAuthConfigDto;

    // Default scopes for Instagram
    const defaultScopes = [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
    ];

    const finalScopes = scopes && scopes.length > 0 ? scopes : defaultScopes;
    const finalRedirectUrl = redirectUrl || "https://backend.composio.dev/api/v3/toolkits/auth/callback";

    try {
      // Create auth config via Composio API
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.composioBaseUrl}/auth-configs`,
          {
            toolkit: "instagram",
            authScheme: "oauth2",
            credentials: {
              clientId: clientId,
              clientSecret: clientSecret,
            },
            scopes: finalScopes,
            redirectUrl: finalRedirectUrl,
          },
          {
            headers: {
              "X-API-Key": this.composioApiKey,
              "Content-Type": "application/json",
            },
          }
        )
      );

      const authConfigId = response.data?.id || response.data?.authConfigId;

      if (!authConfigId) {
        throw new BadRequestException("پاسخ نامعتبر از Composio API");
      }

      // Save auth config to database
      const authConfig = await this.authConfigRepository.save({
        authConfigId: authConfigId,
        toolkit: "instagram",
        authScheme: "oauth2",
        clientId: clientId,
        clientSecret: clientSecret,
        scopes: finalScopes,
        redirectUrl: finalRedirectUrl,
        createdBy: userId,
      });

      return {
        success: true,
        message: "پیکربندی احراز هویت با موفقیت ایجاد شد",
        data: {
          authConfigId: authConfig.authConfigId,
          id: authConfig.id,
          toolkit: authConfig.toolkit,
          scopes: authConfig.scopes,
        },
      };
    } catch (error) {
      console.error("Error creating auth config:", error?.response?.data || error?.message);
      throw new BadRequestException(
        error?.response?.data?.message || 
        error?.message || 
        "خطا در ایجاد پیکربندی احراز هویت"
      );
    }
  }

  /**
   * Get list of auth configs
   */
    async getAuthConfigs(userReq: any, searchBaseDto: any) {
    const { isSuperAdmin } = userReq;

    if (!isSuperAdmin) {
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


}