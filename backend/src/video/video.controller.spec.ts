import { Test, TestingModule } from '@nestjs/testing';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { NotFoundException } from '@nestjs/common';

describe('VideoController', () => {
  let controller: VideoController;
  let service: VideoService;

  const mockVideoService = {
    getVideo: jest.fn(),
    getRoiData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: VideoService,
          useValue: mockVideoService,
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
    service = module.get<VideoService>(VideoService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return a video status if video exists', async () => {
      const mockVideo = { id: 'some-id', status: 'completed' };
      mockVideoService.getVideo.mockResolvedValue(mockVideo);

      const result = await controller.getStatus('some-id');
      expect(result).toEqual(mockVideo);
      expect(mockVideoService.getVideo).toHaveBeenCalledWith('some-id');
    });

    it('should throw NotFoundException if video does not exist', async () => {
      mockVideoService.getVideo.mockResolvedValue(null);

      await expect(controller.getStatus('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRoiData', () => {
    it('should return ROI data format correctly', async () => {
      const mockVideo = { id: 'some-id', frameCount: 100 };
      const mockRoi = [{ frameNumber: 1, xMin: 10, yMin: 20, xMax: 50, yMax: 60 }];
      
      mockVideoService.getVideo.mockResolvedValue(mockVideo);
      mockVideoService.getRoiData.mockResolvedValue(mockRoi);

      const result = await controller.getRoiData('some-id');
      expect(result).toEqual({
        videoId: 'some-id',
        totalFrames: 100,
        facesDetected: 1,
        roiData: mockRoi,
      });
    });
  });
});
