import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useSocketEvents = () => {
  const {
    socket,
    handleStatusUpdate,
    setGlobalStats,
    setActivePlayers,
    setServerError,
    setBanModalData,
    setCanSpin,
    setVersionMismatch,
    setInspectData,
    setLootModalData,
    setOfflineGains,
    setIsWorldBossFight
  } = useAppStore();

  useEffect(() => {
    if (!socket) return;

    socket.on('status_update', handleStatusUpdate);
    socket.on('game_status', handleStatusUpdate);
    socket.on('global_stats_update', setGlobalStats);
    socket.on('active_players_update', setActivePlayers);
    socket.on('error', (err) => setServerError(err?.message || 'Unknown error'));
    socket.on('ban_error', setBanModalData);
    socket.on('daily_status', (data) => setCanSpin(data?.canSpin));
    socket.on('version_mismatch', () => setVersionMismatch(true));
    socket.on('public_profile_data', setInspectData);
    socket.on('offline_report', (data) => {
      console.log('[SOCKET] Received offline_report:', data);
      setOfflineGains(data);
    });
    socket.on('item_used', (result) => {
      if (result?.rewards) {
        setLootModalData(result.rewards);
      }
    });
    socket.on('world_boss_started', () => setIsWorldBossFight(true));

    return () => {
      socket.off('status_update', handleStatusUpdate);
      socket.off('global_stats_update', setGlobalStats);
      socket.off('active_players_update', setActivePlayers);
      socket.off('error');
      socket.off('ban_error', setBanModalData);
      socket.off('daily_status');
      socket.off('version_mismatch');
      socket.off('public_profile_data');
      socket.off('offline_report');
      socket.off('item_used');
      socket.off('world_boss_started');
    };
  }, [
    socket,
    handleStatusUpdate,
    setGlobalStats,
    setActivePlayers,
    setServerError,
    setBanModalData,
    setCanSpin,
    setVersionMismatch,
    setInspectData,
    setLootModalData,
    setOfflineGains,
    setIsWorldBossFight
  ]);
};
