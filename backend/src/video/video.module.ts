import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { ProcessorService } from './processor.service';
import { Video, VideoSchema } from './schemas/video.schema';
import { ROIRecord, ROIRecordSchema } from './schemas/roi.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: ROIRecord.name, schema: ROIRecordSchema },
    ]),
  ],
  controllers: [VideoController],
  providers: [VideoService, ProcessorService],
})
export class VideoModule {}
