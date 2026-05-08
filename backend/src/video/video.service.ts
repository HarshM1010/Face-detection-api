import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './schemas/video.schema';
import { ROIRecord, ROIReccordDocument } from './schemas/roi.schema';
import { ProcessorService } from './processor.service';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    @InjectModel(ROIRecord.name) private roiModel: Model<ROIReccordDocument>,
    private processorService: ProcessorService,
  ) {}

  async createVideoRecord(originalName: string, path: string): Promise<VideoDocument> {
    const video = new this.videoModel({
      originalName,
      originalPath: path,
      status: 'pending',
    });
    return video.save();
  }

  async getVideo(id: string): Promise<VideoDocument | null> {
    return this.videoModel.findById(id).exec();
  }

  async getRoiData(videoId: string): Promise<ROIReccordDocument[]> {
    return this.roiModel.find({ videoId }).sort({ frameNumber: 1 }).exec();
  }

  async processVideo(id: string): Promise<void> {
    const video = await this.videoModel.findById(id);
    if (!video) {
      this.logger.error(`Video ${id} not found for processing`);
      return;
    }

    try {
      video.status = 'processing';
      await video.save();

      this.logger.log(`Starting processing for ${video.originalName}`);
      
      const result = await this.processorService.processFile(video.originalPath, id);
      
      video.width = result.width;
      video.height = result.height;
      video.fps = result.fps;
      video.frameCount = result.frameCount;
      video.processedPath = result.processedPath;
      video.status = 'completed';
      await video.save();

      // Save ROI records
      if (result.roiData.length > 0) {
        await this.roiModel.insertMany(result.roiData);
        this.logger.log(`Saved ${result.roiData.length} ROI records for video ${id}`);
      }

      this.logger.log(`Completed processing for ${video.originalName}`);
    } catch (error) {
      this.logger.error(`Processing failed for video ${id}`, error.stack);
      video.status = 'failed';
      video.errorMessage = error.message;
      await video.save();
    }
  }
}
