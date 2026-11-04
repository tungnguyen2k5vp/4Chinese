import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pathAccessStore } from './use-path-access';

const storage = vi.hoisted(() => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('expo-secure-store', () => storage);
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));

beforeEach(() => { vi.resetAllMocks(); pathAccessStore.setState({ allOpen: false, ready: false, saving: false, error: null }); });
describe('path access UI preference', () => {
  it('defaults to sequential, persists the switch and restores sequential without lesson writes', async () => {
    storage.getItemAsync.mockResolvedValue(null);
    await pathAccessStore.getState().load();
    expect(pathAccessStore.getState().allOpen).toBe(false);
    await pathAccessStore.getState().change(true);
    expect(storage.setItemAsync).toHaveBeenLastCalledWith('4chinese.path.open-access.v1', 'open');
    expect(pathAccessStore.getState().allOpen).toBe(true);
    await pathAccessStore.getState().change(false);
    expect(pathAccessStore.getState().allOpen).toBe(false);
    expect(storage.setItemAsync).toHaveBeenLastCalledWith('4chinese.path.open-access.v1', 'sequential');
  });
  it('retains the active mode when persistence fails and can retry', async () => {
    storage.setItemAsync.mockRejectedValueOnce(Error('device storage'));
    await pathAccessStore.getState().change(true);
    expect(pathAccessStore.getState()).toMatchObject({ allOpen: false, saving: false });
    expect(pathAccessStore.getState().error).toBeTruthy();
    storage.setItemAsync.mockResolvedValue(undefined);
    await pathAccessStore.getState().change(true);
    expect(pathAccessStore.getState()).toMatchObject({ allOpen: true, error: null });
  });
  it('restores open mode on relaunch and blocks concurrent toggle saves', async () => {
    storage.getItemAsync.mockResolvedValue('open');
    await pathAccessStore.getState().load();
    expect(pathAccessStore.getState().allOpen).toBe(true);
    let complete!: () => void;
    storage.setItemAsync.mockImplementation(() => new Promise<void>(resolve => { complete = resolve; }));
    const saving = pathAccessStore.getState().change(false);
    await pathAccessStore.getState().change(true);
    expect(storage.setItemAsync).toHaveBeenCalledTimes(1);
    complete(); await saving;
    expect(pathAccessStore.getState().allOpen).toBe(false);
  });
});
