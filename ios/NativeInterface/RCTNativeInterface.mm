#import "RCTNativeInterface.h"
#import <ReactCommon/RCTTurboModule.h>
#import <React/RCTUtils.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBridge.h>
#import <React/RCTLog.h>
#if NOMIC
#else
#import <AVFoundation/AVFoundation.h>
#endif
#import "ToneEventEmitter.h"
#import "yin_pitch_detector.h"
#import "math.h"

using namespace facebook;

#if NOMIC
@interface RCTNativeInterface () {
#else
  @interface RCTNativeInterface ()<AVAudioRecorderDelegate> {
#endif
    NSTimer *measureTimer;
    NSInteger currentTone;
#if NOMIC
#else
    AVAudioSourceNode *sourceNode;
#endif
    float phase;
    float phaseIncrement;
    BOOL isPlaying;
  }
#if NOMIC
#else
  @property (nonatomic, strong) AVAudioEngine *audioEngine;
  @property (nonatomic, assign) AVAudioFrameCount bufferCapacity;
  @property (nonatomic, assign) AVAudioFrameCount writePosition;
  @property (nonatomic, strong) AVAudioPCMBuffer *circularBuffer;
#endif
  @end
  
  @implementation RCTNativeInterface
  
  - (instancetype)init {
    if (self = [super init]) {
#if NOMIC
#else
      _audioEngine = [[AVAudioEngine alloc] init];
      _bufferCapacity = 44100 * 2;
      AVAudioInputNode *inputNode = _audioEngine.inputNode;
      AVAudioFormat *format = [inputNode inputFormatForBus:0];
      
      _circularBuffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:format frameCapacity:_bufferCapacity];
      
      _writePosition = 0;
#endif
    }
    return self;
  }
  
  - (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeInterfaceSpecJSI>(params);
  }
  
  - (void)test {
    RCTLogInfo(@"aiueo");
  }
  
  - (void)checkPermission:(RCTResponseSenderBlock)callback {
#if NOMIC
    callback(@[@(0), @(YES)]);
#else
    @try {
      AVAudioSessionRecordPermission permissionStatus = [[AVAudioSession sharedInstance] recordPermission];
      RCTLogInfo(@"checkPermission IN");
      
      switch (permissionStatus) {
        case AVAudioSessionRecordPermissionGranted:
          callback(@[@(0), @(YES)]);
          break;
          
        case AVAudioSessionRecordPermissionDenied:
          callback(@[@(0), @(NO)]);
          break;
          
        case AVAudioSessionRecordPermissionUndetermined: {
          [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL granted) {
            dispatch_async(dispatch_get_main_queue(), ^{
              callback(@[@(0), @(granted)]);
            });
          }];
          break;
        }
          
        default:
          callback(@[@(1), @(NO)]);
          break;
      }
    }
    @catch (NSException *exception) {
      RCTLogInfo(@"Exception occurred: %@ %@", exception.name, exception.reason);
      callback(@[@(2), @(NO)]);
    }
#endif
  }
  
  - (NSArray<NSString *> *)supportedEvents {
    return @[@"onMeasureUpdate"];
  }
  
#if NOMIC
  - (void)periodicDebugProc:(NSTimer *)timer {
    NSLog(@"periodicDebugProc IN");
    float buf[4410];
    float frequency = 300.0 + (arc4random_uniform(201));
    
    float phaseIncrement = 2.0 * M_PI * frequency / 44100;
    float phase = 0;
    
    for (int i=0;i < 4410; i++) {
      buf[i] = sinf(phase);
      phase += phaseIncrement;
      if (phase > 2.0 * M_PI) {
        phase -= 2.0 * M_PI;
      }
    }
    float *p = buf;
    // [self dumpFloatBufferAsHex:p length:48];
    NSLog(@"periodicDebugProc");
    float pitch = [self analyzePitchWithBuffer:p length:4410];
    __weak __typeof(self)weakSelf = self;
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
      __strong __typeof(weakSelf) strongSelf = weakSelf;
      RCTLogInfo(@"Pitch: %f", pitch);
      NSLog(@"dispatch_get_global_queue");
      NSDictionary *body = @{
        @"tone": @(strongSelf->currentTone),
        @"pitch": @(pitch)
      };
      [ToneEventEmitter sendMeasureUpdate:body];
    });
  }
  - (void)startDebugTimer {
    measureTimer = [NSTimer scheduledTimerWithTimeInterval:0.5
                                                    target:self
                                                  selector:@selector(periodicDebugProc:)
                                                  userInfo:nil
                                                   repeats:YES];
    NSLog(@"Debug Timer Start");
  }
#endif
  - (void)measureStart:(NSInteger)tone {
    RCTLogInfo(@"[NativeInterface] measureStart called with tone: %ld", (long)tone);
    currentTone = tone;
    
    
    [measureTimer invalidate];
    measureTimer = nil;
    
#if NOMIC
    dispatch_async(dispatch_get_main_queue(), ^{
      [self startDebugTimer];
    });
#else
    [self startAudioEngine];
#endif
    RCTLogInfo(@"Measure started tone:%ld", currentTone);
  }
  
  - (void)measureStop {
    RCTLogInfo(@"[NativeInterface] measureStop called");
    [measureTimer invalidate];
    measureTimer = nil;
    
#if NOMIC
#else
    [self stopAudioEngine];
#endif
  }
  
  - (void)confirmed:(NSInteger)order cb:(RCTResponseSenderBlock)callback {
    RCTLogInfo(@"[NativeInterface] confirmed called with order: %ld", (long)order);
    if (order >= 0) {
      NSString *result = [NSString stringWithFormat:@"Confirmed order: %ld", (long)order];
      callback(@[@(0), result]);
    } else {
      callback(@[@(1), [NSNull null]]);
    }
  }
  
#if NOMIC
#else
  - (void)startAudioEngine {
    AVAudioInputNode *inputNode = self.audioEngine.inputNode;
    AVAudioFormat *format = [inputNode inputFormatForBus:0];
    
    [inputNode installTapOnBus:0
                    bufferSize:1024
                        format:format
                         block:^(AVAudioPCMBuffer *buffer, AVAudioTime *when) {
      [self processAudioBuffer:buffer];
    }];
    
    NSError *error = nil;
    [self.audioEngine startAndReturnError:&error];
    if (error) {
      RCTLogError(@"Error starting audio engine: %@", error);
    } else {
      RCTLogInfo(@"Audio engine started");
    }
  }
  
  - (void)stopAudioEngine {
    [self.audioEngine.inputNode removeTapOnBus:0];
    [self.audioEngine stop];
    RCTLogInfo(@"Audio engine stopped");
  }
#endif
  
  - (void)dumpFloatBufferAsHex:(float *)buffer length:(NSUInteger)length{
    const uint8_t *bytePtr = (const uint8_t *)buffer;
    NSUInteger totalBytes = length * sizeof(float);
    
    NSMutableString *output = [NSMutableString string];
    
    for (NSUInteger i = 0; i < totalBytes; i++) {
      if (i % 16 == 0 && i != 0) {
        [output appendString:@"\n"];
      }
      [output appendFormat:@"%02X ", bytePtr[i]];
    }
    
    RCTLogInfo(@"\n%@", output);
  }
  
#if NOMIC
#else
  - (void)processAudioBuffer:(AVAudioPCMBuffer *)buffer {
    AVAudioFrameCount frameLength = buffer.frameLength;
    float *sourceData = buffer.floatChannelData[0];
    float *destData = self.circularBuffer.floatChannelData[0];
    
    for (AVAudioFrameCount i = 0; i < frameLength; i++) {
      destData[(self.writePosition + i) % self.bufferCapacity] = sourceData[i];
    }
    self.writePosition = (self.writePosition + frameLength) % self.bufferCapacity;
    
    static AVAudioFrameCount lastAnalysisPosition = 0;
    AVAudioFrameCount distance = (self.writePosition + self.bufferCapacity - lastAnalysisPosition) % self.bufferCapacity;
    
    if (distance >= 4410) {
      lastAnalysisPosition = self.writePosition;
      
      float analysisBuffer[4410];
      for (int i = 0; i < 4410; i++) {
        int pos = (self.writePosition + self.bufferCapacity - 4410 + i) % self.bufferCapacity;
        analysisBuffer[i] = destData[pos];
      }
      float *p = analysisBuffer;
      // [self dumpFloatBufferAsHex:p length:48];
      __weak __typeof(self)weakSelf = self;
      dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        __strong __typeof(weakSelf) strongSelf = weakSelf;
        float pitch = [self analyzePitchWithBuffer:p length:4410];
        RCTLogInfo(@"Pitch: %f", pitch);
        NSDictionary *body = @{
          @"tone": @(strongSelf->currentTone),
          @"pitch": @(pitch)
        };
        [ToneEventEmitter sendMeasureUpdate:body];
      });
    }
  }
#endif
  
  - (float)analyzePitchWithBuffer:(float *)buf length:(int)length {
    return yin_get_pitch(buf, length, 44100);
  }
  
  - (float)midi2freq:(int)midi {
    return 440.0 * powf(2.0, (midi - 69) / 12.0);
  }
  - (void)playSample:(long)midi {
#if NOMIC
#else
    if (isPlaying) {
      [self stopSample];
    }
    NSError *sessionError = nil;
    [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayAndRecord
                                     withOptions:AVAudioSessionCategoryOptionDefaultToSpeaker
                                           error:&sessionError];
    if (sessionError) {
      NSLog(@"AVAudioSession setCategory error: %@", sessionError);
    }
    [[AVAudioSession sharedInstance] setActive:YES error:&sessionError];
    if (sessionError) {
      NSLog(@"AVAudioSession setActive error: %@", sessionError);
    }
    
    float sampleRate = 44100.0;
    float frequency = [self midi2freq:midi];
    phaseIncrement = 2.0 * M_PI * frequency / sampleRate;
    
    NSLog(@"playSample %f", frequency);
    
    __weak __typeof__(self) weakSelf = self;
    sourceNode = [[AVAudioSourceNode alloc]
                  initWithRenderBlock:^OSStatus(BOOL *isSilence,
                                                const AudioTimeStamp *timestamp,
                                                AVAudioFrameCount frameCount,
                                                AudioBufferList *outputData) {
      __strong __typeof__(weakSelf) self = weakSelf;
      for (int i = 0; i < outputData->mNumberBuffers; ++i) {
        float *buf = (float *)outputData->mBuffers[i].mData;
        for (NSUInteger frame = 0; frame < frameCount; ++frame) {
          buf[frame] = sinf(self->phase);
          self->phase += self->phaseIncrement;
          if (self->phase > 2.0 * M_PI) {
            self->phase -= 2.0 * M_PI;
          }
        }
      }
      return noErr;
    }];
    
    AVAudioFormat *format = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:sampleRate channels:1];
    [_audioEngine attachNode:sourceNode];
    [_audioEngine connect:sourceNode to:_audioEngine.mainMixerNode format:format];
    
    NSError *error = nil;
    if (![_audioEngine isRunning]) {
      [_audioEngine startAndReturnError:&error];
      if (error) {
        NSLog(@"Engine start error: %@", error);
        return;
      }
    }
    
    isPlaying = YES;
#endif
  }
  - (void)stopSample {
#if NOMIC
#else
    if (!isPlaying) return;
    
    [_audioEngine disconnectNodeInput:sourceNode];
    [_audioEngine detachNode:sourceNode];
    sourceNode = nil;
    isPlaying = NO;
#endif
  }
  
  + (NSString *)moduleName {
    return @"NativeInterface";
  }
  
  @end
