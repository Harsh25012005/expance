import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

export const SHAKE_EVENT_NAME = 'SHAKE_TO_ADD_EXPENSE';

export const emitShakeEvent = () => {
  console.log('[SHAKE DEBUG] Dispatching global SHAKE_TO_ADD_EXPENSE event');
  DeviceEventEmitter.emit(SHAKE_EVENT_NAME);
};

export const addShakeListener = (callback: () => void): EmitterSubscription => {
  return DeviceEventEmitter.addListener(SHAKE_EVENT_NAME, () => {
    console.log('[SHAKE DEBUG] Add Expense listener received event');
    callback();
  });
};
