import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { transcribeOnline } from './api';
import { bytesToBase64, MAX_RECORDING_MS } from './audio';

// Speech doesn't need studio quality. Mono at 16 kHz keeps a minute of audio small enough to upload quickly.
const VOICE_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, sampleRate: 16000, numberOfChannels: 1, bitRate: 32000 };

/**
 * Press-to-talk speech input. Call `toggle` to start recording and again to stop; the recording is
 * transcribed by the Worker and the text is passed to `onText`.
 */
export function useVoiceInput(onText: (text: string) => void) {
  const recorder = useAudioRecorder(VOICE_OPTIONS);
  const state = useAudioRecorderState(recorder, 250);
  const [transcribing, setTranscribing] = useState(false);

  // The latest handler, so a recording that finishes later still uses the current conversation.
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  // Stops the recording by itself after a minute, which is as long as the transcription service accepts.
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutoStop = useCallback(() => {
    if (autoStop.current) clearTimeout(autoStop.current);
    autoStop.current = null;
  }, []);
  useEffect(() => clearAutoStop, [clearAutoStop]);

  const stop = useCallback(async () => {
    clearAutoStop();
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('The recording was empty');
      setTranscribing(true);
      const file = new File(uri);
      const text = await transcribeOnline(bytesToBase64(new Uint8Array(await file.arrayBuffer())));
      file.delete();
      onTextRef.current(text);
    } catch (e) {
      Alert.alert('Could not use that recording', e instanceof Error ? e.message : 'Try again, or type instead.');
    } finally {
      setTranscribing(false);
    }
  }, [recorder, clearAutoStop]);

  const start = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access in your phone’s settings to talk to the assistant.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      autoStop.current = setTimeout(stop, MAX_RECORDING_MS);
    } catch (e) {
      console.warn('Could not start recording', e);
      Alert.alert('Could not start recording', 'Try again, or type instead.');
    }
  }, [recorder, stop]);

  return {
    recording: state.isRecording,
    durationMillis: state.durationMillis,
    transcribing,
    toggle: () => (state.isRecording ? stop() : transcribing ? undefined : start()),
  };
}
