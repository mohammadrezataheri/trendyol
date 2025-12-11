import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminInstagramPostController } from "./instagram-post.controller";
import { InstagramPostService } from "./instagram-post.service";
import InstagramAccount from "./entity/instagram.entity";
import AuthConfig from "./entity/auth-config.entity";
import InstagramPostConfig from "./entity/instagram-post.entity";

@Module({
    imports: [
      HttpModule,
        ConfigModule,
        TypeOrmModule.forFeature([InstagramAccount, InstagramPostConfig, AuthConfig]),

    ],  
    controllers: [AdminInstagramPostController],
    providers: [InstagramPostService],
    exports: [InstagramPostService],
  })
  export class InstagramPostModule {}
  
  