import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export class AudioManager {
  constructor(sources = {}, { enableHaptics = true } = {}) {
    this.sources = sources;
    this.enableHaptics = enableHaptics;
    this.sounds = {};
    this.enabled = Object.values(sources).some(Boolean);
    this.lastHapticAt = 0;
    this.ready = this.init();
  }

  async init() {
    if (!this.enabled) return;
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    await this.loadSound('breathing', this.sources.breathing, { isLooping: true });
    await this.loadSound('footsteps', this.sources.footsteps, { isLooping: true });
    await this.loadSound('heartbeat', this.sources.heartbeat, { isLooping: true });
    await this.loadSound('cheer', this.sources.cheer, { isLooping: false });
  }

  async loadSound(key, source, initialStatus) {
    if (!source) return;
    const { sound } = await Audio.Sound.createAsync(source, initialStatus);
    this.sounds[key] = sound;
  }

  async updateAudio(deltaMeters) {
    if (!this.enabled) return;
    await this.ready;

    const distance = Math.abs(deltaMeters);

    if (deltaMeters < -50) {
      await this.stopAll();
      return;
    }

    if (deltaMeters < -20) {
      await this.playFootsteps(0.3, -0.6);
      return;
    }

    if (deltaMeters < -5) {
      await this.playFootsteps(0.6, -0.4);
      await this.playBreathing(0.4, -0.4);
      return;
    }

    if (distance <= 5) {
      await this.playBreathing(0.85, deltaMeters > 0 ? 0.4 : -0.4);
      await this.playHeartbeat(0.75);
      this.maybeHaptic();
      return;
    }

    if (deltaMeters < 20) {
      await this.playBreathing(0.5, 0.5);
      await this.playFootsteps(0.45, 0.5);
      return;
    }

    await this.stopAll();
  }

  async playBreathing(volume, pan) {
    await this.playLooped('breathing', volume, pan);
  }

  async playFootsteps(volume, pan) {
    await this.playLooped('footsteps', volume, pan);
  }

  async playHeartbeat(volume) {
    await this.playLooped('heartbeat', volume, 0);
  }

  async playCheer() {
    const sound = this.sounds.cheer;
    if (!sound) return;
    await sound.replayAsync();
  }

  async playLooped(key, volume, pan) {
    const sound = this.sounds[key];
    if (!sound) return;

    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      await sound.setVolumeAsync(volume);
      if (sound.setPanAsync) {
        await sound.setPanAsync(pan);
      }
      if (!status.isPlaying) {
        await sound.playAsync();
      }
    }
  }

  async stopAll() {
    const keys = Object.keys(this.sounds);
    for (const key of keys) {
      const sound = this.sounds[key];
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.stopAsync();
      }
    }
  }

  async unload() {
    const keys = Object.keys(this.sounds);
    for (const key of keys) {
      const sound = this.sounds[key];
      await sound.unloadAsync();
    }
  }

  maybeHaptic() {
    if (!this.enableHaptics) return;
    const now = Date.now();
    if (now - this.lastHapticAt < 2000) return;
    this.lastHapticAt = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}
