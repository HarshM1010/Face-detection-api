import { Injectable, Logger } from '@nestjs/common';
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createCanvas, loadImage } from 'canvas';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';

@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);
  private detector: faceDetection.FaceDetector;

  constructor() {
    this.initDetector().catch(e => this.logger.error('Failed to init face detector', e));
  }

  async initDetector() {
    await tf.ready();
    const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
    const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
      runtime: 'tfjs',
    };
    this.detector = await faceDetection.createDetector(model, detectorConfig);
    this.logger.log('Face detector initialized successfully');
  }

  async processFile(videoPath: string, videoId: string): Promise<any> {
    const tempDir = path.join('./processed', `temp_${videoId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const processedPath = path.join('./processed', `processed_${videoId}.mp4`);
    
    // Get metadata
    const metadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
    const width = videoStream.width || 640;
    const height = videoStream.height || 480;
    let fps = 30;
    if (videoStream.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split('/');
      if (parts.length === 2) {
        fps = parseInt(parts[0]) / parseInt(parts[1]);
      }
    }

    // 1. Extract frames
    this.logger.log(`Extracting frames from ${videoPath}...`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([`-q:v 2`])
        .output(path.join(tempDir, 'frame-%05d.jpg'))
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .run();
    });

    // 2. Process frames
    const frames = fs.readdirSync(tempDir).filter(f => f.endsWith('.jpg')).sort();
    const frameCount = frames.length;
    this.logger.log(`Extracted ${frameCount} frames. Processing faces...`);

    const roiData = [];
    
    for (let i = 0; i < frames.length; i++) {
      const frameName = frames[i];
      const framePath = path.join(tempDir, frameName);
      
      const image = await loadImage(framePath);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      // Detect faces
      if (this.detector) {
        const faces = await this.detector.estimateFaces(canvas as any);
        if (faces && faces.length > 0) {
          // Take the highest confidence face
          const face = faces[0];
          
          const xMin = Math.round(face.box.xMin);
          const yMin = Math.round(face.box.yMin);
          const xMax = Math.round(face.box.xMax);
          const yMax = Math.round(face.box.yMax);
          const confidence = 1.0; // MediaPipe face_detection doesn't always return conf natively here, so we mock or use what's available
          
          roiData.push({
            videoId,
            frameNumber: i + 1,
            xMin,
            yMin,
            xMax,
            yMax,
            confidence
          });

          // Draw box
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 3;
          ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);
          
          // Save modified frame
          const buffer = canvas.toBuffer('image/jpeg');
          fs.writeFileSync(framePath, buffer);
        }
      }
      
      if (i % 30 === 0) {
        this.logger.log(`Processed ${i}/${frameCount} frames`);
      }
    }

    // 3. Stitch video
    this.logger.log(`Stitching frames into ${processedPath}...`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(path.join(tempDir, 'frame-%05d.jpg'))
        .inputFPS(fps)
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p'
        ])
        .save(processedPath)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err));
    });

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      width,
      height,
      fps,
      frameCount,
      processedPath,
      roiData
    };
  }
}
