import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function navigateToInstrumentPassport(instrumentId?: string, model?: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Instruments', {
      screen: 'Passport',
      params: {
        instrument: {
          id: instrumentId || 'INST-TS-01',
          model: model || 'Verified Legal Metrology Equipment',
        },
      },
    });
  }
}
