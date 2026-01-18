import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';

const DEBUG_AUDIO = true;

export class AudioManager {
  constructor(sources = {}, { enableHaptics = true, debug = DEBUG_AUDIO } = {}) {
    this.sources = sources;
    this.enableHaptics = enableHaptics;
    this.alwaysOn = false;
    this.sounds = {};
    this.enabled = Object.values(sources).some(Boolean);
    this.lastHapticAt = 0;
    this.debug = debug;
    this.debugLogged = new Set();
    this.playedKeys = new Set();
    this.playStatusLogged = new Set();
    this.ready = this.init();
  }

  setAlwaysOn(value) {
    this.alwaysOn = Boolean(value);
  }

  log(message, data) {
    if (!this.debug) return;
    if (typeof data === 'undefined') {
      console.log(`[Audio] ${message}`);
    } else {
      console.log(`[Audio] ${message}`, data);
    }
  }

  logOnce(key, message, data) {
    if (!this.debug) return;
    if (this.debugLogged.has(key)) return;
    this.debugLogged.add(key);
    this.log(message, data);
  }

  async init() {
    if (!this.enabled) return;
    this.log('init start', {
      enabled: this.enabled,
      sources: Object.keys(this.sources),
    });
    try {
      await Audio.setIsEnabledAsync(true);
      const audioMode = {
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      };
      this.log('audio mode set', audioMode);
      await Audio.setAudioModeAsync(audioMode);
      try {
        const mode = await Audio.getAudioModeAsync();
        this.log('audio mode', mode);
      } catch (error) {
        this.log('audio mode read failed', error?.message ?? error);
      }
    } catch (error) {
      this.log('audio mode error', error?.message ?? error);
      throw error;
    }

    await this.loadSound('breathing', this.sources.breathing, { isLooping: true });
    await this.loadSound('footsteps', this.sources.footsteps, { isLooping: true });
    await this.loadSound('heartbeat', this.sources.heartbeat, { isLooping: true });
    await this.loadSound('ghostDistant', this.sources.ghostDistant, {
      isLooping: true,
    });
    await this.loadSound('bossTheme', this.sources.bossTheme, { isLooping: true });
    await this.loadSound('cheer', this.sources.cheer, { isLooping: false });
    this.log('init complete', { loaded: Object.keys(this.sounds) });
  }

  async loadSound(key, source, initialStatus) {
    if (!source) {
      this.logOnce(`missing:${key}`, `missing source for ${key}`);
      return;
    }
    try {
      const { sound } = await Audio.Sound.createAsync(source, initialStatus);
      this.sounds[key] = sound;
      this.logOnce(`loaded:${key}`, `loaded ${key}`);
    } catch (error) {
      this.logOnce(`error:${key}`, `failed to load ${key}`, error?.message ?? error);
    }
  }

  async updateAudio(deltaMeters, { forceAmbient = this.alwaysOn } = {}) {
    if (!this.enabled) {
      this.logOnce('disabled', 'audio disabled: no sources configured');
      return;
    }
    this.logOnce('update-start', 'updateAudio first call', {
      deltaMeters,
      forceAmbient,
    });
    await this.ready;

    const distance = Math.abs(deltaMeters);
    if (forceAmbient) {
      const ghostVolume = Math.max(0.12, Math.min(0.6, 0.6 - distance / 120));
      const ghostPan = deltaMeters < 0 ? -0.2 : 0.2;
      await this.playGhostDistant(ghostVolume, ghostPan);
    }

    if (deltaMeters < -50) {
      if (forceAmbient) {
        await this.playAmbient();
      } else {
        await this.stopAll();
      }
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

    if (deltaMeters < 60) {
      await this.playFootsteps(0.2, 0.7);
      return;
    }

    if (forceAmbient) {
      await this.playAmbient();
      return;
    }

    await this.stopAll();
  }

  async playAmbient() {
    await this.playGhostDistant(0.25, 0);
    await this.playBreathing(0.35, 0);
    await this.playFootsteps(0.25, 0);
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

  async playGhostDistant(volume, pan) {
    await this.playLooped('ghostDistant', volume, pan);
  }

  async playBossTheme(volume) {
    await this.playLooped('bossTheme', volume, 0);
  }

  async playCheer() {
    const sound = this.sounds.cheer;
    if (!sound) {
      this.logOnce('missing:cheer', 'cheer sound missing');
      return;
    }
    try {
      await sound.replayAsync();
      if (!this.playStatusLogged.has('cheer')) {
        this.playStatusLogged.add('cheer');
        const status = await sound.getStatusAsync();
        this.log('cheer status', status);
      }
    } catch (error) {
      this.log('cheer play error', error?.message ?? error);
    }
  }

  async playLooped(key, volume, pan) {
    const sound = this.sounds[key];
    if (!sound) {
      this.logOnce(`missing:${key}`, `sound not loaded for ${key}`);
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        this.logOnce(`not-loaded:${key}`, `${key} not loaded yet`, status);
        return;
      }
      await sound.setVolumeAsync(volume);
      if (sound.setPanAsync) {
        await sound.setPanAsync(pan);
      }
      if (!status.isPlaying) {
        if (!this.playedKeys.has(key)) {
          this.playedKeys.add(key);
          this.log(`playing ${key}`, { volume, pan });
        }
        await sound.playAsync();
      }
      if (!this.playStatusLogged.has(key)) {
        this.playStatusLogged.add(key);
        const after = await sound.getStatusAsync();
        this.log(`${key} status`, after);
      }
    } catch (error) {
      this.log(`playLooped error for ${key}`, error?.message ?? error);
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
