import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import { Int32 } from 'react-native/Libraries/Types/CodegenTypes';

/**
 * Native module interface definition for pitch measurement and permission handling.
 */
export interface Spec extends TurboModule {
  /**
   * Checks if the necessary permission is granted.
   *
   * @param cb - Callback that receives an error code and permission result.
   */
  checkPermission(cb: (err: Int32, result: boolean) => void): void;

  /**
   * Starts pitch measurement for a given tone.
   *
   * @param tone - MIDI note number to measure against.
   */
  measureStart(tone: Int32): void;

  /**
   * Confirms the result for a given order.
   *
   * @param order - Order of the measurement to confirm.
   * @param cb - Callback that receives an error code and result as a string.
   */
  confirmed(order: Int32, cb: (err: Int32, result: string) => void): void;

  /**
   * Stops the pitch measurement.
   */
  measureStop(): void;

  /**
   * Test function (implementation-defined).
   */
  test(): void;

  playSample(tone: Int32): void;
  stopSample(): void;
}

/**
 * Enforced native module registration for the Spec interface.
 */
export default TurboModuleRegistry.getEnforcing<Spec>('NativeInterface');