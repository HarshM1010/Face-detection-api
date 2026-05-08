import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, BadRequestException, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoService } from './video.service';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4() + extname(file.originalname);
          cb(null, uniqueSuffix);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(mp4|avi|mov|mkv|webm)$/)) {
          return cb(new BadRequestException('Unsupported file format'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const video = await this.videoService.createVideoRecord(file.originalname, file.path);
    
    // Start processing asynchronously
    this.videoService.processVideo(video._id.toString()).catch(console.error);

    return {
      id: video._id,
      filename: video.originalName,
      status: video.status,
      message: 'Video uploaded successfully. Processing started.',
    };
  }

  @Get(':id/stream')
  async streamVideo(@Param('id') id: string, @Res() res: Response) {
    const video = await this.videoService.getVideo(id);
    if (!video) throw new NotFoundException('Video not found');

    if (video.status === 'pending' || video.status === 'processing') {
      return res.status(202).json({
        status: video.status,
        message: 'Video is still being processed. Try again shortly.',
      });
    }

    if (video.status === 'failed') {
      return res.status(422).json({
        status: 'failed',
        message: 'Video processing failed.',
        error: video.errorMessage,
      });
    }

    if (!video.processedPath || !fs.existsSync(video.processedPath)) {
      throw new NotFoundException('Processed video file not found on disk');
    }

    res.sendFile(video.processedPath, { root: '.' });
  }

  @Get(':id/roi')
  async getRoiData(@Param('id') id: string) {
    const video = await this.videoService.getVideo(id);
    if (!video) throw new NotFoundException('Video not found');

    const roiData = await this.videoService.getRoiData(id);

    return {
      videoId: video._id,
      totalFrames: video.frameCount || 0,
      facesDetected: roiData.length,
      roiData: roiData,
    };
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const video = await this.videoService.getVideo(id);
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }
}
