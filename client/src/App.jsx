import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
console.log("[App.jsx] Initializing App component...");
import { io } from 'socket.io-client';
import { supabase } from './supabase';
import Auth from './components/Auth';
import CharacterSelection from './components/CharacterSelection';
import ChatWidget from './components/ChatWidget';
import Sidebar from './components/Sidebar';
import InventoryPanel from './components/InventoryPanel';
import ActivityWidget from './components/ActivityWidget';
import ProfilePanel from './components/ProfilePanel';
import ItemInfoModal from './components/ItemInfoModal';
import MarketPanel from './components/MarketPanel';
import ActivityModal from './components/ActivityModal';
import RankingPanel from './components/RankingPanel';
import DungeonPanel from './components/DungeonPanel';
import RenameModal from './components/RenameModal';
import BottomNav from './components/BottomNav';
import { SkillsOverview, TownOverview, CombatOverview } from './components/MobileHubs';
import WorldBossPanel from './components/WorldBossPanel';
import WorldBossFight from './components/WorldBossFight';
import InspectModal from './components/InspectModal';
import LeaderboardModal from './components/LeaderboardModal';

import CombatPanel from './components/CombatPanel';
import RunePanel from './components/RunePanel';
import OfflineGainsModal from './components/OfflineGainsModal';
import MarketListingModal from './components/MarketListingModal';
import CombatHistoryModal from './components/CombatHistoryModal';
import LootModal from './components/LootModal';
import BuffsDrawer from './components/BuffsDrawer';
import NotificationCenter from './components/NotificationCenter';
import ToastContainer from './components/ToastContainer';
import OrbShop from './components/OrbShop';
import DailySpinModal from './components/DailySpinModal';
import SocialPanel from './components/SocialPanel';
import TradePanel from './components/TradePanel';
import {
  Zap, Package, User, Trophy, Coins,
  Axe, Pickaxe, Target, Shield, Sword, Skull,
  Star, Layers, Box, Castle, Lock, Menu, X, Tag, Clock, Heart, LogOut, ChevronDown, Circle, Users, Gift
} from 'lucide-react';
import { ITEMS, resolveItem, getSkillForItem, getLevelRequirement, formatItemId } from '@shared/items';
import { calculateNextLevelXP, XP_TABLE } from '@shared/skills';
import { motion, AnimatePresence } from 'framer-motion';
import { useOptimisticState } from './hooks/useOptimisticState';
import ResponsiveText from './components/ResponsiveText';



const mapTabCategoryToSkill = (tab, category) => {
  const maps = {
    gathering: {
      WOOD: 'LUMBERJACK',
      ORE: 'ORE_MINER',
      HIDE: 'ANIMAL_SKINNER',
      FIBER: 'FIBER_HARVESTER',
      FISH: 'FISHING',
      HERB: 'HERBALISM'
    },
    refining: {
      PLANK: 'PLANK_REFINER',
      BAR: 'METAL_BAR_REFINER',
      LEATHER: 'LEATHER_REFINER',
      CLOTH: 'CLOTH_REFINER',
      EXTRACT: 'DISTILLATION'
    },
    crafting: {
      WARRIORS_FORGE: 'WARRIOR_CRAFTER',
      HUNTERS_LODGE: 'HUNTER_CRAFTER',
      MAGES_TOWER: 'MAGE_CRAFTER',
      COOKING_STATION: 'COOKING',
      ALCHEMY_LAB: 'ALCHEMY',
      TOOLMAKER: 'TOOL_CRAFTER'
    },
    combat: {
      COMBAT: 'COMBAT'
    },
    merging: {
      RUNE: 'RUNE'
    },
    dungeon: {
      DUNGEONEERING: 'DUNGEONEERING'
    }
  };
  return maps[tab.toLowerCase()]?.[category.toUpperCase()];
};

import { formatNumber, formatSilver } from '@utils/format';

const TaxHistoryChart = ({ history = [], totalTax, tax_24h_ago, isMobile }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Get dates for mock data
  const getMockDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const formatDayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const mockData = [
    { amount: 452189, label: getMockDate(6) },
    { amount: 621450, label: getMockDate(5) },
    { amount: 589321, label: getMockDate(4) },
    { amount: 843210, label: getMockDate(3) },
    { amount: 712908, label: getMockDate(2) },
    { amount: 924556, label: getMockDate(1) },
    { amount: 1056782, label: getMockDate(0) }
  ];

  const displayData = useMemo(() => {
    const todayIncrease = Math.max(0, totalTax - (tax_24h_ago || 0));

    // Build raw data first
    const rawData = [];
    let totalVolume = todayIncrease;

    for (let i = 6; i >= 1; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const historyItem = history.find(h => h.date === dateStr);
      const val = historyItem ? historyItem.amount : (mockData.find(m => m.label === formatDayDate(d))?.amount || 0);
      rawData.push({ amount: val, date: d });
      totalVolume += val;
    }

    // Apply stable "natural" distribution
    // We generate weights based on a hash of the date string so they are fixed per day
    const getStableBatchWeights = (dates) => {
      return dates.map(d => {
        const label = formatDayDate(d);
        let hash = 0;
        for (let i = 0; i < label.length; i++) {
          hash = label.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Consistent variation between 0.85 and 1.15
        return 0.85 + (Math.abs(hash % 30) / 100);
      });
    };

    const pastDates = rawData.map(d => d.date);
    const pastWeights = getStableBatchWeights(pastDates);
    const todayWeight = 1.05; // Today is slightly above the baseline average

    const allWeights = [...pastWeights, todayWeight];
    const totalWeight = allWeights.reduce((a, b) => a + b, 0);

    const distributed = rawData.map((d, i) => ({
      ...d,
      amount: (allWeights[i] / totalWeight) * totalVolume,
      label: formatDayDate(d.date)
    }));

    distributed.push({
      amount: (todayWeight / totalWeight) * totalVolume,
      label: 'TODAY'
    });

    return distributed;
  }, [totalTax, tax_24h_ago, history]);

  const maxVal = Math.max(...displayData.map(h => h.amount), 1000);
  const chartHeight = 50;
  const barWidth = isMobile ? 25 : 35;
  const gap = 8;
  const totalWidth = (barWidth + gap) * displayData.length - gap;

  return (
    <div style={{
      marginTop: '5px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'rgba(0,0,0,0.15)',
      padding: '15px 10px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      position: 'relative'
    }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>DAILY TAX INCREASE (LAST 7 DAYS)</div>

      <div style={{ height: '15px', marginBottom: '5px' }}>
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{
                fontSize: '0.7rem',
                color: 'var(--accent)',
                fontWeight: '900',
                fontFamily: 'monospace'
              }}
            >
              +{formatNumber(displayData[hoveredIndex].amount)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <svg width={totalWidth} height={chartHeight + 20} style={{ overflow: 'visible' }}>
        {displayData.map((day, i) => {
          const h = Math.max(4, (day.amount / maxVal) * chartHeight);
          return (
            <g key={i}>
              <motion.rect
                initial={{ height: 0, y: chartHeight }}
                animate={{
                  height: h,
                  y: chartHeight - h,
                  fillOpacity: hoveredIndex === i ? 1 : 0.4 + (i * 0.08)
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                transition={{
                  height: { delay: i * 0.05, duration: 0.5 },
                  fillOpacity: { duration: 0.2 }
                }}
                x={i * (barWidth + gap)}
                width={barWidth}
                fill="var(--accent)"
                rx="3"
                style={{ cursor: 'pointer' }}
              />
              <text
                x={i * (barWidth + gap) + barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                style={{
                  fontSize: '0.55rem',
                  fill: hoveredIndex === i ? 'var(--text-main)' : 'var(--text-dim)',
                  fontWeight: hoveredIndex === i ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                  fontFamily: 'monospace'
                }}
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <div className="glass-panel" style={{
    padding: '15px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  }}>
    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
    <div style={{ fontSize: '1.2rem', color: color || 'var(--text-main)', fontWeight: '900', fontFamily: 'monospace' }}>
      {formatNumber(value)}
    </div>
  </div>
);

function App() {
  const [session, setSession] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const clockOffset = useRef(0);
  const displayedGameState = useOptimisticState(gameState);
  const [error, setError] = useState('');
  const [initialAuthView, setInitialAuthView] = useState('LOGIN');
  // characterSelected is no longer needed, we use selectedCharacter (charId) as the source of truth

  // Navigation State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'inventory');
  const prevTabRef = React.useRef(localStorage.getItem('activeTab') || 'inventory');
  const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem('activeCategory') || 'WOOD');

  // Helper for safe inventory access
  const getSafeAmount = (entry) => {
    if (!entry) return 0;
    if (typeof entry === 'number') return entry;
    if (typeof entry === 'object') return entry.amount || 0;
    return 0;
  };
  const [activeTier, setActiveTier] = useState(() => parseInt(localStorage.getItem('activeTier')) || 1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [infoItem, setInfoItem] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [offlineReport, setOfflineReport] = useState(null);
  const [marketSellItem, setMarketSellItem] = useState(null);
  const [marketFilter, setMarketFilter] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [globalStats, setGlobalStats] = useState({ total_market_tax: 0 });

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCombatHistory, setShowCombatHistory] = useState(false);
  const [showFullNumbers, setShowFullNumbers] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [lootModalData, setLootModalData] = useState(null);
  const [showOrbShop, setShowOrbShop] = useState(false);
  const [showDailySpin, setShowDailySpin] = useState(false);
  const [isWorldBossFight, setIsWorldBossFight] = useState(false);

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [pendingPotion, setPendingPotion] = useState(null);

  const [dailySpinOpen, setDailySpinOpen] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Trade State
  const [activeTrade, setActiveTrade] = useState(null);
  const [tradeInvites, setTradeInvites] = useState([]);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [inspectData, setInspectData] = useState(null);

  const handleInspectPlayer = useCallback((name) => {
    if (socket && name) {
      socket.emit('get_public_profile', { characterName: name });
    }
  }, [socket]);

  const handleCloseInspect = useCallback(() => setInspectData(null), []);
  const handleItemClick = useCallback((item) => setInfoItem(item), []);

  const handleRenameSubmit = (newName) => {
    socket.emit('change_name', { newName });
    setIsRenameModalOpen(false);
  };

  useEffect(() => {
    if (gameState?.state?.notifications) {
      setNotifications(gameState.state.notifications);
    }
  }, [gameState]);

  const addNotification = (notif) => {
    setNotifications(prev => [{
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      read: false,
      ...notif
    }, ...prev].slice(0, 10));
  };

  const markAsRead = (id) => {
    socket?.emit('mark_notification_read', { notificationId: id });
  };

  const clearAllNotifications = () => {
    socket?.emit('clear_notifications');
  };

  const markAllAsRead = () => {
    socket?.emit('mark_all_notifications_read');
  };

  const handleListOnMarket = (id, item) => {
    if (item && typeof item === 'object') {
      setMarketSellItem({ ...item, itemId: id });
    } else if (typeof id === 'object') {
      setMarketSellItem({ ...id, itemId: id.itemId || id.id });
    } else {
      setMarketSellItem({ itemId: id });
    }
  };


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalItem(null);
        setInfoItem(null);
        setMarketSellItem(null);
        setOfflineReport(null);
        setSidebarOpen(false);
        setShowNotifications(false);
        setShowCombatHistory(false);
        setShowCurrencyDropdown(false);
        setInspectData(mockData);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close currency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showCurrencyDropdown && !e.target.closest('[data-currency-dropdown]')) {
        setShowCurrencyDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCurrencyDropdown]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist navigation
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('activeCategory', activeCategory);
    localStorage.setItem('activeTier', activeTier);

    if (activeTab === 'trade') {
      setShowSocialModal(true);
      // Refresh trade list when opening
      if (socket) socket.emit('trade_get_active');
      // Restore to previous tab instead of forcing inventory
      setActiveTab(prevTabRef.current || 'inventory');
    } else {
      // Track the previous tab (only if not 'trade')
      prevTabRef.current = activeTab;
    }
  }, [activeTab, activeCategory, activeTier]);

  // Monitor Offline Report from GameState
  useEffect(() => {
    if (gameState?.offlineReport) {

      setOfflineReport(gameState.offlineReport);
    }
  }, [gameState]);

  // Update Last Active on Unload
  useEffect(() => {
    const handleUnload = () => {
      if (session?.access_token) {
        const url = `${import.meta.env.VITE_API_URL}/api/update_last_active`;

        // Use sendBeacon for reliable unload requests (no CORS preflight if simple content type)
        if (navigator.sendBeacon) {
          const blob = new Blob([new URLSearchParams({ token: session.access_token }).toString()], { type: 'application/x-www-form-urlencoded' });
          navigator.sendBeacon(url, blob);
        } else {
          // Fallback
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            keepalive: true
          }).catch(err => console.error("Failed to update last active:", err));
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [session]);

  const [selectedCharacter, setSelectedCharacter] = useState(() => localStorage.getItem('selectedCharacterId'));
  const [serverError, setServerError] = useState(null);
  const [activePlayers, setActivePlayers] = useState(0);

  // Fetch Active Players for Header (and mobile profile)
  useEffect(() => {
    const fetchActivePlayers = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/api/active_players`);
        if (res.ok) {
          const data = await res.json();
          setActivePlayers(data.count || 0);
        }
      } catch (err) {
        console.warn('Could not fetch active players count');
      }
    };

    fetchActivePlayers();
    const interval = setInterval(fetchActivePlayers, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  // Auto-connect if session and character already exist
  useEffect(() => {
    if (session?.access_token && selectedCharacter && !socket) {

      setIsConnecting(true);
      connectSocket(session.access_token, selectedCharacter);
    }
  }, [session, selectedCharacter, socket]);

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If we landed with an access token in the hash, clean it up
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') {
        // Clear hash after successful OAuth/OTP landing
        if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
      if (event === 'PASSWORD_RECOVERY') {
        setInitialAuthView('RESET');
      }
      if (!session) {
        if (socket) socket.disconnect();
        setGameState(null);
        setSelectedCharacter(null);
        localStorage.removeItem('selectedCharacterId');
        setSocket(null);
        setInitialAuthView('LOGIN');
      }
    });

    return () => subscription.unsubscribe();
  }, [socket]);

  // Socket Connection Function
  const connectSocket = (token, characterId) => {
    if (socket?.connected) return;

    const socketUrl = import.meta.env.VITE_API_URL;

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      setConnectionError(null);
      setIsConnecting(false);
      // Join Character Room
      newSocket.emit('join_character', { characterId });
      newSocket.emit('request_daily_status');
      newSocket.emit('trade_get_active'); // Fetch pending trades
    });

    newSocket.on('daily_status', ({ canSpin }) => {
      setCanSpin(canSpin);
    });

    newSocket.on('disconnect', () => {
      setIsConnecting(true);
    });



    newSocket.on('connect_error', async (err) => {
      console.error('Connection error:', err);

      // If it's an auth error, try to refresh the session
      if (err.message?.includes('Authentication error') || err.message?.includes('Invalid token')) {
        // Prevent infinite fast loops by checking if we just tried this
        const lastAttempt = newSocket._lastAuthRetry || 0;
        const now = Date.now();
        if (now - lastAttempt < 2000) {
          console.warn('Auth retry too fast, waiting for standard timeout...');
        } else {

          newSocket._lastAuthRetry = now;

          // Force a session refresh
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();

          if (refreshedSession && !error) {

            setSession(refreshedSession);
            newSocket.auth.token = refreshedSession.access_token;
            newSocket.connect();
            return;
          } else {
            console.error('Failed to auto-refresh session:', error);

            // Critical Fix: If Refresh Token is invalid/missing, we MUST log out to break the loop.
            const isFatalAuthError =
              error?.message?.includes('Refresh Token Not Found') ||
              error?.message?.includes('Invalid Refresh Token') ||
              error?.code === '400';

            if (isFatalAuthError || err.message?.includes('Invalid token')) {
              console.warn('Fatal Auth Error detected. Clearing storage and logging out...');
              await supabase.auth.signOut();

              // Deep cleanup to avoid search loops with old data
              localStorage.clear();
              sessionStorage.clear();

              setSession(null);
              setGameState(null);
              setSelectedCharacter(null);
              setSocket(null);

              // Reload to ensure Supabase state is reset
              window.location.reload();
              return;
            }
          }
        }
      }

      setConnectionError('Connection failed. Retrying in 5s...');
      setIsConnecting(true);
      setTimeout(() => {
        if (newSocket.disconnected) newSocket.connect();
      }, 5000);
    });

    newSocket.on('status_update', (status) => {
      // console.log('[DEBUG-CLIENT] status_update received. Notifications:', status.state?.notifications?.length);
      const now = Date.now();
      const serverTime = new Date(status.serverTime || now).getTime();
      clockOffset.current = now - serverTime;

      if (status.offlineReport) {
        setOfflineReport(status.offlineReport);
      }

      if (status.noCharacter) {
        console.warn("Character ID not found on server (Migration mismatch). Resetting selection.");
        localStorage.removeItem('selectedCharacterId');
        setSelectedCharacter(null);
        setGameState(null);
        return;
      }

      if (status.globalStats) {
        setGlobalStats(status.globalStats);
      }

      setGameState(status);
      setIsConnecting(false);
    });

    newSocket.on('global_stats_update', (stats) => {
      console.log('[DEBUG-CLIENT] global_stats_update received:', stats);
      setGlobalStats(stats);
    });

    newSocket.on('server_version', ({ version }) => {
      // client version is 1.0.0
      const CLIENT_VERSION = '1.0.0';
      if (version && version !== CLIENT_VERSION) {
        console.warn(`[VERSION] Version mismatch: Server ${version} vs Client ${CLIENT_VERSION}. Reloading...`);
        // Add a small delay for better user experience
        setTimeout(() => {
          window.location.reload(true);
        }, 2000);
      }
    });



    newSocket.on('error', (err) => {
      console.error('[SERVER-ERROR]', err);
      setServerError(err.message || 'An error occurred');
    });

    newSocket.on('item_used', (result) => {
      if (!result) return;
      if (result.requiresConfirmation) {
        setPendingPotion(result.pendingItem);
        return;
      }

      if (result.rewards) {
        setLootModalData(result.rewards);
      }

      // Separate check for special token handling
      if (result.itemId === 'NAME_CHANGE_TOKEN') {
        setIsRenameModalOpen(true);
      }

      if (result.message) {
        addNotification({
          type: 'SYSTEM',
          message: result.message
        });
      }
    });

    newSocket.on('global_stats_update', (stats) => {
      setGlobalStats(stats);
    });

    newSocket.on('trade_invite', (trade) => {
      setTradeInvites(prev => [...prev, trade]);
    });

    newSocket.on('world_boss_started', (res) => {
      if (res.success) {
        setIsWorldBossFight(true);
        setActiveTab('inventory'); // Clean UI backdrop
      }
    });

    newSocket.on('world_boss_reward_claimed', (res) => {
      if (res.success) {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'SUCCESS',
          message: res.message,
          timestamp: Date.now()
        }, ...prev]);
      }
    });

    newSocket.on('trade_update', (trade) => {
      if (trade.status === 'COMPLETED' || trade.status === 'CANCELLED') {
        setActiveTrade(null);
      } else {
        // Update current trade OR auto-open if we are the sender (initiated the trade)
        setActiveTrade(prev => {
          if (prev?.id === trade.id) return trade;
          if (!prev && trade.sender_id === characterId) return trade;
          return prev;
        });
      }
    });

    newSocket.on('trade_list', (list) => {
      setTradeInvites(list);
    });

    newSocket.on('trade_success', (data) => {
      addNotification({ type: 'SYSTEM', message: data.message });
      setActiveTrade(null);
    });

    newSocket.on('public_profile_data', (data) => {
      // Capture snapshot - only update if not already inspecting this player
      setInspectData(prev => {
        if (!prev || prev.name !== data.name) return data;
        return prev;
      });
    });

    setSocket(newSocket);
  };

  // Cleanup Socket on Unmount
  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    }
  }, [socket]);

  const handleCharacterSelect = (charId) => {
    setCanSpin(false); // Reset to false while loading new char
    setSelectedCharacter(charId);
    localStorage.setItem('selectedCharacterId', charId);
    if (session?.access_token) {
      setIsConnecting(true); // Show loading
      connectSocket(session.access_token, charId);
    }
  };


  const handleSwitchCharacter = () => {
    if (socket) socket.disconnect();
    setCanSpin(false); // Reset state
    setSelectedCharacter(null);
    localStorage.removeItem('selectedCharacterId');
    setGameState(null);
    setSocket(null);
  };

  const handleLogout = async () => {
    // For anonymous/guest users, we don't necessarily want to wipe the session
    // because once they sign out, they lose access to that account forever.
    // Instead, we just clear the local state to take them back to the Auth screen.
    if (session?.user?.is_anonymous) {
      // Just clear React state, but keep the session in Supabase storage
      setSession(null);
    } else {
      await supabase.auth.signOut();
      setSession(null);
    }

    localStorage.removeItem('selectedCharacterId');
    setGameState(null);
    setSelectedCharacter(null);
  };

  const handleEquip = (itemId) => {
    if (socket) {
      socket.emit('equip_item', { itemId });
    }
  };

  const handleUseItem = (itemId, quantity = 1) => {
    if (socket) {
      socket.emit('use_item', { itemId, quantity });
    }

    // Client-side redirection for Battle Rune Shards
    if (itemId === 'T1_BATTLE_RUNE_SHARD' || (itemId && itemId.includes('BATTLE') && itemId.includes('SHARD'))) {
      setActiveTab('merging');
      setActiveCategory('COMBAT');
    } else if (itemId && itemId.includes('_SHARD') && itemId.includes('RUNE')) {
      setActiveTab('merging');
      // Default to GATHERING if not already set, or keep current
      if (activeCategory === 'COMBAT') setActiveCategory('GATHERING');
    }
  };

  const handleUnequip = (slot) => {
    if (socket) {
      socket.emit('unequip_item', { slot });
    }
  };

  const startActivity = (type, itemId, quantity = 1) => {
    socket.emit('start_activity', { actionType: type, itemId, quantity });
    setModalItem(null);
  };

  const claimReward = () => {
    socket.emit('claim_reward');
  };

  const isLocked = (type, item) => {
    if (!displayedGameState?.state || !item) return false;
    const tier = Number(item.tier) || 1;
    const skillKey = getSkillForItem(item.id, type);
    const userLevel = displayedGameState.state.skills?.[skillKey]?.level || 1;
    const requiredLevel = getLevelRequirement(tier);

    if (tier > 1) {
      // console.log(`[DEBUG-LOCK-LIST] ${item.id}: Tier=${tier}, Skill=${skillKey}, UserLv=${userLevel}, ReqLv=${requiredLevel}, LOCKED=${userLevel < requiredLevel}`);
    }

    return userLevel < requiredLevel;
  };

  const SkillProgressHeader = ({ tab, category }) => {
    if (!displayedGameState?.state?.skills) return null;

    const skillKey = mapTabCategoryToSkill(tab, category);
    const skill = displayedGameState.state.skills[skillKey];

    if (!skill) return null;

    if (skillKey === 'RUNE') {
      return (
        <div className="glass-panel" style={{
          padding: '12px 20px',
          marginBottom: '15px',
          background: 'var(--accent-soft)',
          border: '1px solid var(--border-active)',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {category}
          </div>
        </div>
      );
    }

    const nextXP = calculateNextLevelXP(skill.level);
    const progress = Math.min(100, (skill.xp / nextXP) * 100);
    const remainingXP = nextXP - skill.xp;

    return (
      <div className="glass-panel" style={{
        padding: '12px 20px',
        marginBottom: '15px',
        background: 'var(--accent-soft)',
        border: '1px solid var(--border-active)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {category}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-main)' }}>
              Lv {skill.level} <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>({Math.floor(progress)}%)</span>
            </div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>
              {formatNumber((XP_TABLE[skill.level - 1] || 0) + skill.xp)} / {XP_TABLE[skill.level] ? formatNumber(XP_TABLE[skill.level]) : 'MAX'} XP
            </div>
          </div>
        </div>
        <div style={{ height: '3px', background: 'var(--slot-bg)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent-soft)',
              transition: 'width 0.2s ease-out'
            }}
          />
        </div>
      </div>
    );
  };

  const renderTierFilter = () => {
    const tiersList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '10px',
        marginBottom: '20px',
        background: 'var(--accent-soft)',
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid var(--border)'
      }}>
        {tiersList.map(t => (
          <button
            key={t}
            onClick={() => setActiveTier(t)}
            style={{
              background: activeTier === t ? 'var(--accent)' : 'var(--glass-bg)',
              border: '1px solid',
              borderColor: activeTier === t ? 'var(--accent)' : 'var(--border)',
              color: activeTier === t ? 'var(--panel-bg)' : 'var(--text-dim)',
              padding: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '900',
              transition: '0.2s',
              fontSize: '0.7rem',
              textAlign: 'center',
              letterSpacing: '1px'
            }}
          >
            TIER {t}
          </button>
        ))}
      </div>
    );
  };

  const renderActionButton = (type, item, extraStyles = {}) => {
    const locked = isLocked(type, item);
    const req = getLevelRequirement(item.tier);

    const label = type === 'GATHERING' ? 'GATHER'
      : type === 'REFINING' ? 'REFINE'
        : type === 'CRAFTING' ? 'CRAFT'
          : 'ACTION';

    return (
      <button
        key={item.id}
        onClick={() => {
          if (!locked) {
            setModalItem(item);
            setModalType(type);
          }
        }}
        disabled={locked}
        style={{
          ...actionBtnStyle,
          ...extraStyles,
          opacity: locked ? 0.5 : 1,
          cursor: locked ? 'not-allowed' : 'pointer',
          borderRadius: '8px',
          padding: '8px 20px',
          background: locked ? 'var(--accent-soft)' : 'rgba(76, 175, 80, 0.12)', // Greenish for action
          border: '1px solid',
          borderColor: locked ? 'var(--border)' : 'rgba(76, 175, 80, 0.4)',
          color: locked ? 'var(--text-dim)' : '#2e7d32',
          fontWeight: '900',
          fontSize: '0.75rem',
          letterSpacing: '1px',
          height: 'fit-content'
        }}
      >
        {locked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={12} />
            LV {req}
          </div>
        ) : (
          label
        )}
      </button>
    );
  };



  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePanel
          gameState={displayedGameState}
          session={session}
          socket={socket}
          onShowInfo={setInfoItem}
          isMobile={isMobile}
          theme={theme}
          toggleTheme={toggleTheme}

          onOpenRenameModal={() => {
            setIsRenameModalOpen(true);
          }} />;


      case 'skills_overview':
        return <SkillsOverview gameState={displayedGameState} onNavigate={(tab, cat) => { setActiveTab(tab); if (cat) setActiveCategory(cat); }} />;
      case 'town_overview':
        return <TownOverview
          onNavigate={(tab) => setActiveTab(tab)}
          gameState={displayedGameState}
          canSpin={canSpin}
          onOpenDailySpin={() => setDailySpinOpen(true)}
          hasActiveTrade={tradeInvites?.length > 0 || !!activeTrade}
          isAnonymous={session?.user?.is_anonymous}
          onShowGuestModal={() => setShowGuestModal(true)}
        />;
      case 'combat_overview':
        return <CombatOverview gameState={displayedGameState} onNavigate={(tab) => setActiveTab(tab)} />;
      case 'gathering':
      case 'refining': {
        const isGathering = activeTab === 'gathering';
        const activeCategoryData = isGathering ? ITEMS.RAW[activeCategory] : ITEMS.REFINED[activeCategory];
        const itemsToRender = Object.values(activeCategoryData || {}).filter(item => item.tier === activeTier);

        if (!activeCategoryData || Object.keys(activeCategoryData).length === 0) {
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <SkillProgressHeader tab={activeTab} category={activeCategory} />
              <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧪</div>
                  <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>COMING SOON</h2>
                  <p style={{ color: '#888' }}>Alchemy system in development.</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab={activeTab} category={activeCategory} />
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'var(--panel-bg)' }}>
              <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>
                  {activeCategory} {isGathering ? 'GATHERING' : 'REFINING'}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '15px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                    <button key={t} onClick={() => setActiveTier(t)} style={{ padding: '6px', background: activeTier === t ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: activeTier === t ? 'var(--border-active)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', color: activeTier === t ? 'var(--accent)' : '#555', fontSize: '0.65rem', fontWeight: '900' }}>T{t}</button>
                  ))}
                </div>
              </div>
              <div className="scroll-container" style={{ padding: isMobile ? '20px' : '30px 40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {itemsToRender.map(item => {
                    const locked = isLocked(isGathering ? 'GATHERING' : 'REFINING', item);
                    const reqLevel = getLevelRequirement(item.tier);
                    const reqs = item.req || {}; // For refining

                    const isActive = displayedGameState?.current_activity?.item_id === item.id;
                    const duration = (item.time || (isGathering ? 3.0 : 1.5)) * 1000;

                    const skillKey = mapTabCategoryToSkill(activeTab, activeCategory);
                    const skill = displayedGameState?.state?.skills?.[skillKey] || { level: 1, xp: 0 };
                    const nextXP = calculateNextLevelXP(skill.level);
                    const skillProgress = (skill.xp / nextXP) * 100;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setModalItem(item);
                          setModalType(isGathering ? 'GATHERING' : 'REFINING');
                        }}
                        disabled={false}
                        className="resource-card"
                        style={{
                          borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px',
                          opacity: locked ? 0.7 : 1,
                          cursor: 'pointer',
                          filter: 'none',
                          background: isActive ? 'var(--accent-soft)' : 'rgba(0,0,0,0.2)',
                          width: '100%',
                          textAlign: 'left',
                          border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'var(--accent-soft)'; }}
                        onMouseLeave={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'var(--slot-bg)'; }}
                      >
                        {/* Icon Container */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'var(--panel-bg)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {item.icon ? (
                            <img
                              src={item.icon}
                              alt={item.name}
                              style={{
                                width: item.scale || '100%',
                                height: item.scale || '100%',
                                objectFit: 'contain',
                                filter: locked ? 'grayscale(100%) opacity(0.5)' : 'none'
                              }}
                            />
                          ) : (
                            isGathering ? (
                              <Pickaxe size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                            ) : (
                              <Box size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                            )
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1 1 0%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? 'var(--text-dim)' : (isActive ? 'var(--accent)' : 'var(--text-main)') }}>
                              {item.name}
                              {locked && <Lock size={14} color="#f87171" />}
                              {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ACTIVE</motion.span>}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Tier Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span>T{item.tier}</span>
                            </div>

                            {/* Time Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Clock size={12} />
                              <span>{item.time || (isGathering ? '3.0' : '1.5')}s</span>
                            </div>

                            {/* XP Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <Star size={12} />
                              <span>{item.xp} XP</span>
                            </div>

                            {/* Req Level Badge (Locked only) */}
                            {locked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                                <span>Req Lv {reqLevel}</span>
                              </div>
                            )}



                            {/* Ingredients Badge (Refining only) */}
                            {!isGathering && reqs && Object.entries(reqs).map(([reqId, reqQty]) => {
                              const entry = displayedGameState?.state?.inventory?.[reqId];
                              const userQty = getSafeAmount(entry);
                              const hasEnough = userQty >= reqQty;
                              return (
                                <div key={reqId} style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: hasEnough ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: hasEnough ? '#4caf50' : '#ff4444',
                                  border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`
                                }}>
                                  <span>{userQty}/{reqQty} {reqId}</span>
                                </div>
                              );
                            })}
                          </div>

                          {isActive && (
                            <ActivityProgressBar
                              activity={displayedGameState.current_activity}
                              serverTimeOffset={clockOffset.current}
                            />
                          )}
                          {isActive && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                              {displayedGameState.current_activity.initial_quantity - displayedGameState.current_activity.actions_remaining}/{displayedGameState.current_activity.initial_quantity}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'crafting': {
        const craftingItems = ITEMS.GEAR[activeCategory] || {};
        const allItemsInCategory = [];
        Object.values(craftingItems).forEach(itemTypeGroup => {
          Object.values(itemTypeGroup).forEach(item => {
            allItemsInCategory.push(item);
          });
        });

        const itemsToRender = allItemsInCategory.filter(i => i.tier === activeTier);

        if (!craftingItems || Object.keys(craftingItems).length === 0) {
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <SkillProgressHeader tab={activeTab} category={activeCategory} />
              <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'var(--panel-bg)' }}>
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚗️</div>
                  <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>COMING SOON</h2>
                  <p style={{ color: 'var(--text-dim)' }}>Alchemy Lab under construction.</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab={activeTab} category={activeCategory} />
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'var(--panel-bg)' }}>
              <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>
                  {activeCategory} CRAFTING
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '15px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                    <button key={t} onClick={() => setActiveTier(t)} style={{ padding: '6px', background: activeTier === t ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: activeTier === t ? 'var(--border-active)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', color: activeTier === t ? 'var(--accent)' : '#555', fontSize: '0.65rem', fontWeight: '900' }}>T{t}</button>
                  ))}
                </div>
              </div>
              <div className="scroll-container" style={{ padding: isMobile ? '20px' : '30px 40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {itemsToRender.map(item => {
                    // Resolve item to ensure we show the correct "in-game" stats (especially for Mage lookup)
                    const resolved = resolveItem(item.id) || item;
                    const reqs = resolved.req || item.req || {};
                    const stats = resolved.stats || item.stats || {};

                    const statsList = [];
                    if (resolved.heal) statsList.push({ icon: <Heart size={12} />, val: `${resolved.heal} Heal`, color: '#4caf50' });
                    if (stats.damage) statsList.push({ icon: <Sword size={12} />, val: `${stats.damage} Dmg`, color: '#ff4444' });
                    if (stats.defense) statsList.push({ icon: <Shield size={12} />, val: `${stats.defense} Def`, color: '#4caf50' });
                    if (stats.hp) statsList.push({ icon: <Heart size={12} />, val: `${stats.hp} HP`, color: '#ff4d4d' });
                    if (stats.speed) statsList.push({ icon: <Zap size={12} />, val: `${stats.speed} Spd`, color: 'var(--accent)' });
                    if (stats.attackSpeed) statsList.push({ icon: <Zap size={12} />, val: `${(1000 / stats.attackSpeed).toFixed(2)}/s`, color: 'var(--accent)' });

                    // Main stat for sorting/highlighting if needed, but we render the list now
                    const mainStat = statsList[0] || null;

                    const type = activeTab.toUpperCase();
                    const locked = isLocked(type, item);
                    const reqLevel = getLevelRequirement(item.tier);
                    const isActive = displayedGameState?.current_activity?.item_id === item.id;

                    const skillKey = mapTabCategoryToSkill(activeTab, activeCategory);
                    const skill = displayedGameState?.state?.skills?.[skillKey] || { level: 1, xp: 0 };
                    const nextXP = calculateNextLevelXP(skill.level);

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setModalItem(item);
                          setModalType('CRAFTING');
                        }}
                        className="resource-card"
                        style={{
                          borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px',
                          opacity: locked ? 0.7 : 1,
                          cursor: 'pointer',
                          background: isActive ? 'var(--accent-soft)' : 'rgba(0,0,0,0.2)',
                          width: '100%',
                          textAlign: 'left',
                          border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Icon Container */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'var(--panel-bg)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {item.icon ? (
                            <img src={item.icon} alt={item.name} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain', filter: locked ? 'grayscale(100%) opacity(0.5)' : 'none' }} />
                          ) : (
                            locked ? <Lock size={20} color="#555" /> : <Layers size={20} style={{ opacity: 0.7 }} color="var(--accent)" />
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1 1 0%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? 'var(--text-dim)' : (isActive ? 'var(--accent)' : 'var(--text-main)') }}>
                              {item.name}
                              {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ACTIVE</motion.span>}
                            </span>
                          </div>
                          {(resolved.desc || resolved.description) && (
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px', fontStyle: 'italic' }}>
                              {resolved.desc || resolved.description}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--slot-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                              <span>T{item.tier}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--slot-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                              <Clock size={12} />
                              <span>{item.time || 3.0}s</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--slot-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                              <Star size={12} />
                              <span>{item.xp} XP</span>
                            </div>
                            {statsList.map((stat, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--slot-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: locked ? '#555' : stat.color, border: '1px solid var(--border)' }}>
                                {React.cloneElement(stat.icon, { size: 12, color: locked ? '#555' : stat.color })}
                                <span>{stat.val}</span>
                              </div>
                            ))}
                            {Object.entries(reqs).map(([reqId, reqQty]) => {
                              const entry = displayedGameState?.state?.inventory?.[reqId];
                              const userQty = getSafeAmount(entry);
                              const hasEnough = userQty >= reqQty;
                              return (
                                <div key={reqId} style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: hasEnough ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: hasEnough ? '#4caf50' : '#ff4444',
                                  border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`
                                }}>
                                  <span>{userQty}/{reqQty} {formatItemId(reqId)}</span>
                                </div>
                              );
                            })}
                          </div>
                          {isActive && (
                            <ActivityProgressBar activity={displayedGameState.current_activity} serverTimeOffset={clockOffset.current} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'inventory':
        return <InventoryPanel gameState={displayedGameState} socket={socket} onEquip={handleEquip} onShowInfo={setInfoItem} onListOnMarket={handleListOnMarket} onUse={handleUseItem} isMobile={isMobile} />;
      case 'ranking':
        return <RankingPanel gameState={displayedGameState} isMobile={isMobile} socket={socket} onInspect={handleInspectPlayer} />;
      case 'world_boss':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="world_boss" category="WORLD_BOSS" />
            <WorldBossPanel
              socket={socket}
              gameState={displayedGameState}
              isMobile={isMobile}
              onChallenge={handleStartWorldBoss}
              onInspect={handleInspectPlayer}
            />
          </div>
        );
      case 'market':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="market" category="MARKETPLACE" />
            <MarketPanel
              socket={socket}
              gameState={displayedGameState}
              silver={displayedGameState?.state?.silver || 0}
              onShowInfo={setInfoItem}
              onListOnMarket={handleListOnMarket}
              isMobile={isMobile}
              isAnonymous={session?.user?.is_anonymous}
              filter={marketFilter}
              onClearFilter={() => setMarketFilter(null)}
            />
          </div>
        );
      case 'trade':
        return null; // TradePanel is a modal, handled separately
      case 'taxometer': {
        const marketTax = globalStats?.market_tax_total || 0;
        const tradeTax = globalStats?.trade_tax_total || 0;
        const totalTax = globalStats?.total_market_tax || 0;
        const taxHistory = globalStats?.history || [];

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '20px', justifyContent: 'center', height: '100%', overflowY: 'auto' }}>
            <div className="glass-panel" style={{
              padding: isMobile ? '20px' : '30px',
              borderRadius: '16px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '15px' : '20px',
              maxWidth: '600px',
              margin: '0 auto',
              width: '100%'
            }}>
              <div>
                <div style={{ color: 'var(--accent)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '3px', marginBottom: '8px' }}>GLOBAL ECONOMY</div>
                <h2 style={{ color: 'var(--text-main)', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>
                  TAXOMETER
                </h2>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: isMobile ? '20px 10px' : '30px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 215, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 'bold' }}>TOTAL TAXES COLLECTED</div>

                {/* Odometer-style Animation */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px', marginBottom: '5px' }}>
                  <motion.div
                    key={totalTax}
                    initial={{ scale: 1.1, color: '#fff' }}
                    animate={{ scale: 1, color: 'var(--accent)' }}
                    transition={{ duration: 0.5 }}
                    style={{
                      fontSize: isMobile ? '2rem' : '2.5rem',
                      fontWeight: '900',
                      fontFamily: 'monospace',
                      textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    {formatNumber(totalTax)}
                  </motion.div>
                </div>

                <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'rgba(74, 222, 128, 0.6)', fontSize: '0.65rem', fontWeight: 'bold' }}>
                  <div style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 8px #4ade80' }}></div>
                  LIVE COUNTER
                </div>
              </div>

              {/* Breakdown Cards */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <StatCard label="Marketplace" value={marketTax} color="var(--t5)" />
                <StatCard label="Player Trades" value={tradeTax} color="var(--t3)" />
              </div>

              <TaxHistoryChart
                history={taxHistory}
                totalTax={totalTax}
                tax_24h_ago={globalStats?.tax_24h_ago}
                isMobile={isMobile}
              />

              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: isMobile ? '0.7rem' : '0.8rem', lineHeight: '1.5', maxWidth: '450px', margin: '0 auto' }}>
                <p style={{ margin: 0 }}>
                  Monitoring the global flow of Silver.
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}> 20% </span> from Market and
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}> 15% </span> from Trades are collected to maintain a healthy economy.
                </p>
              </div>
            </div>
          </div>
        );
      }
      case 'combat':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="combat" category="COMBAT" />
            <CombatPanel socket={socket} gameState={displayedGameState} isMobile={isMobile} onShowHistory={() => setShowCombatHistory(true)} />
          </div>
        );
      case 'dungeon':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="dungeon" category="DUNGEONEERING" />
            <DungeonPanel socket={socket} gameState={displayedGameState} isMobile={isMobile} serverTimeOffset={clockOffset.current} />
          </div>
        );
      case 'merging':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SkillProgressHeader tab="merging" category={activeCategory} />
            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto' }}>
              <RunePanel gameState={displayedGameState} onShowInfo={setInfoItem} isMobile={isMobile} socket={socket} onListOnMarket={handleListOnMarket} activeCategory={activeCategory} />
            </div>
          </div>
        );
      default:
        return <div style={{ padding: 20, textAlign: 'center', color: '#555' }}>Select a category</div>;
    }
  };

  const handleNavigate = (itemId) => {
    if (itemId === 'world_boss') {
      setActiveTab('world_boss');
      return;
    }
    if (itemId === 'combat') {
      setActiveTab('combat');
      return;
    }
    if (itemId === 'trade') {
      setShowSocialModal(true);
      return;
    }
    if (itemId === 'dungeon') {
      setActiveTab('dungeon');
      return;
    }
    // Procurar em Gathering
    for (const [category, tiers] of Object.entries(ITEMS.RAW)) {
      for (const [t, item] of Object.entries(tiers)) {
        if (item.id === itemId) {
          setActiveTab('gathering');
          setActiveCategory(category);
          setActiveTier(Number(t));
          setModalItem(null);
          return;
        }
      }
    }
    // Procurar em Refining
    for (const [category, tiers] of Object.entries(ITEMS.REFINED)) {
      for (const [t, item] of Object.entries(tiers)) {
        if (item.id === itemId) {
          setActiveTab('refining');
          setActiveCategory(category);
          setActiveTier(Number(t));
          setModalItem(null);
          return;
        }
      }
    }

    // Procurar em Crafting/Gear
    for (const [stationKey, itemTypes] of Object.entries(ITEMS.GEAR)) {
      for (const [itemType, tiers] of Object.entries(itemTypes)) {
        for (const [t, item] of Object.entries(tiers)) {
          if (item.id === itemId) {
            setActiveTab('crafting');
            setActiveCategory(stationKey); // stationKey ex: WARRIORS_FORGE
            setActiveTier(Number(t));
            setModalItem(null);
            return;
          }
        }
      }
    }
  };

  const handleSearchInMarket = (itemName) => {
    setMarketFilter(itemName);
    setActiveTab('market');
    setModalItem(null);
  };

  const handleStartWorldBoss = () => {
    if (socket) {
      socket.emit('start_world_boss_fight');
    }
  };



  if (!session || initialAuthView === 'RESET') {
    return <Auth onLogin={setSession} initialView={initialAuthView} />;
  }

  if (!selectedCharacter) {
    return <CharacterSelection onSelectCharacter={handleCharacterSelect} />;
  }

  // Loading state while connecting
  if (!gameState && isConnecting) {
    return <div className="loading-screen"><div className="spinner"></div>Connecting to World...</div>;
  }

  // Guard: if invalid state
  if (!gameState || !gameState.state) {
    return <div className="loading-screen"><div className="spinner"></div>Loading Game State...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)', fontFamily: "'Inter', sans-serif", position: 'relative', paddingBottom: isMobile ? '70px' : '0' }}>
      {!isMobile && (
        <Sidebar
          gameState={displayedGameState}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          activeTier={activeTier}
          setActiveTier={setActiveTier}
          onNavigate={handleNavigate}
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSwitchCharacter={handleSwitchCharacter}
          theme={theme}
          toggleTheme={toggleTheme}
          socket={socket}
          canSpin={canSpin}
          onOpenDailySpin={() => setDailySpinOpen(true)}
          hasActiveTrade={tradeInvites?.length > 0 || !!activeTrade}
          isAnonymous={session?.user?.is_anonymous}
          onShowGuestModal={() => setShowGuestModal(true)}
        />
      )}

      {isMobile && <BottomNav
        gameState={displayedGameState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={handleNavigate}
        canSpin={canSpin}
        hasActiveTrade={tradeInvites?.length > 0 || !!activeTrade}
        isAnonymous={session?.user?.is_anonymous}
        onShowGuestModal={() => setShowGuestModal(true)}
      />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
        <header style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(10, 14, 20, 0.4)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          padding: isMobile ? '12px 15px' : '15px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          flexWrap: 'nowrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : 20, minWidth: 0 }}>
            {/* Active Players Indicator - Header Left - Mobile Only */}
            {isMobile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(74, 222, 128, 0.05)', padding: '6px 12px',
                borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.15)',
                marginRight: '12px',
                cursor: 'help'
              }} title="Players Online">
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 8px #4ade80' }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4ade80', fontFamily: 'monospace' }}>{activePlayers}</span>
              </div>
            )}


            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #90d5ff 0%, #003366 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User color="#000" size={16} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{displayedGameState?.name?.toUpperCase() || 'ADVENTURER'}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>
            {/* Currency Display with Dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} data-currency-dropdown>
              <button
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--border-active)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: '0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(144, 213, 255, 0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Coins size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {formatSilver(displayedGameState?.state?.silver || 0, true)}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  color="var(--accent)"
                  style={{
                    transition: '0.2s',
                    transform: showCurrencyDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: 0.6
                  }}
                />
              </button>

              {/* Currency Dropdown */}
              {showCurrencyDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-active)',
                    borderRadius: '12px',
                    padding: '12px',
                    minWidth: '200px',
                    zIndex: 1000,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Silver Row - Display Only */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--accent-soft)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid var(--border-active)',
                      transition: '0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Coins size={20} color="var(--accent)" />
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>SILVER</div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--accent)', fontFamily: 'monospace' }}>
                          {formatSilver(displayedGameState?.state?.silver || 0, false)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Orbs/Crowns Row - Opens Shop */}
                  <div
                    onClick={() => {
                      setShowCurrencyDropdown(false);
                      setShowOrbShop(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--accent-soft)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid var(--border-active)',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(144, 213, 255, 0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Circle size={20} color="var(--accent)" />
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>ORBS</div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--accent)', fontFamily: 'monospace' }}>
                          {formatNumber(displayedGameState?.state?.orbs || 0)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 'bold', opacity: 0.7 }}>SHOP →</div>
                  </div>
                </div>
              )}
            </div>




            <NotificationCenter
              notifications={notifications}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAllNotifications}
              onClickTrigger={() => setShowNotifications(!showNotifications)}
            />
            <button onClick={handleSwitchCharacter} style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', letterSpacing: '1.5px', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }} title="Switch Character">
              <Users size={16} />
            </button>
            <button onClick={handleLogout} style={{ color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', letterSpacing: '1.5px', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '10px' : '20px 30px',
          position: 'relative',
          minHeight: 0,
          maxWidth: isMobile ? '100vw' : '1440px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Guest Account Warning Banner */}
          {session?.user?.is_anonymous && (
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '10px',
              padding: '10px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} color="#d4af37" />
                <span style={{ fontSize: '0.85rem', color: '#d4af37', fontWeight: '500' }}>
                  {isMobile ? "Guest Account: Save progress!" : "You are playing as a Guest. Save your progress by linking your account!"}
                </span>
              </div>
              <button
                onClick={() => setActiveTab('profile')} // Redirect to profile to see link button
                style={{
                  background: '#d4af37',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  color: '#000',
                  fontSize: '0.75rem',
                  fontWeight: '900',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                SAVE PROGRESS
              </button>
            </div>
          )}

          {error && <div style={{ background: 'rgba(255, 68, 68, 0.05)', color: '#ff4444', padding: '12px 20px', marginBottom: 25, borderRadius: 8, border: '1px solid rgba(255, 68, 68, 0.1)', fontSize: '0.8rem' }}>{error}</div>}

          {renderContent()}
        </main>
      </div >

      <ChatWidget socket={socket} user={session.user} characterName={displayedGameState?.name} isMobile={isMobile} onInspect={handleInspectPlayer} />
      <BuffsDrawer gameState={displayedGameState} isMobile={isMobile} />
      <ActivityWidget
        gameState={displayedGameState}
        onStop={() => socket.emit('stop_activity')}
        socket={socket}
        onNavigate={handleNavigate}
        isMobile={isMobile}
        serverTimeOffset={clockOffset.current}
        skillProgress={gameState?.current_activity && displayedGameState?.state?.skills ? (() => {
          const s = displayedGameState.state.skills[getSkillForItem(gameState.current_activity.item_id, gameState.current_activity.type)];
          if (!s) return 0;
          if (s.level >= 100) return 100;
          return (s.xp / calculateNextLevelXP(s.level || 1)) * 100;
        })() : 0}
      />
      <ToastContainer socket={socket} />

      {isWorldBossFight && (
        <WorldBossFight
          gameState={displayedGameState}
          socket={socket}
          onFinish={() => {
            setIsWorldBossFight(false);
            setActiveTab('world_boss'); // Return to boss panel
          }}
        />
      )}

      {
        modalItem && (
          <ActivityModal
            isOpen={!!modalItem}
            onClose={() => setModalItem(null)}
            item={modalItem}
            type={modalType}
            gameState={displayedGameState}
            onStart={startActivity}
            onNavigate={handleNavigate}
            onSearchInMarket={handleSearchInMarket}
          />
        )
      }

      <ItemInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
      {
        marketSellItem && (
          <MarketListingModal
            listingItem={marketSellItem}
            onClose={() => setMarketSellItem(null)}
            socket={socket}
          />
        )
      }
      <OfflineGainsModal
        isOpen={!!offlineReport}
        data={offlineReport}
        onClose={() => {
          setOfflineReport(null);
          if (socket) {
            socket.emit('acknowledge_offline_report');
          }
        }}
      />
      <CombatHistoryModal
        isOpen={showCombatHistory}
        onClose={() => setShowCombatHistory(false)}
        socket={socket}
      />

      <LootModal
        isOpen={!!lootModalData}
        onClose={() => setLootModalData(null)}
        rewards={lootModalData}
      />

      {
        showOrbShop && (
          <OrbShop
            socket={socket}
            gameState={displayedGameState}
            onClose={() => setShowOrbShop(false)}
          />
        )
      }

      <AnimatePresence>
        {serverError && (
          <div key="server-error-backdrop" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'rgba(25, 25, 30, 0.95)',
                border: '1px solid #ff444466',
                borderRadius: '16px',
                padding: '30px',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                position: 'relative'
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                background: 'rgba(255, 68, 68, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1px solid rgba(255, 68, 68, 0.2)'
              }}>
                <X color="#ff4444" size={32} />
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', marginBottom: '10px' }}>SYSTEM ERROR</h2>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '25px' }}>
                {serverError}
              </p>
              <button
                onClick={() => setServerError(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#ff4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: '0.2s',
                  boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)'
                }}
                onMouseOver={(e) => e.target.style.background = '#ff5555'}
                onMouseOut={(e) => e.target.style.background = '#ff4444'}
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onSubmit={handleRenameSubmit}
      />

      <DailySpinModal
        isOpen={dailySpinOpen}
        onClose={() => setDailySpinOpen(false)}
        socket={socket}
      />

      <AnimatePresence>
        {showSocialModal && (
          <SocialPanel
            key="social-panel-modal"
            gameState={displayedGameState}
            socket={socket}
            isOpen={showSocialModal}
            onClose={() => setShowSocialModal(false)}
            onInspect={handleInspectPlayer}
            onInvite={(target) => {
              const isId = target.includes('-'); // Simple UUID check
              if (isId) {
                const trade = tradeInvites.find(t => t.id === target);
                if (trade) setActiveTrade(trade);
              } else {
                socket.emit('trade_create', { receiverName: target });
              }
              setShowSocialModal(false);
            }}
            tradeInvites={tradeInvites}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTrade && (
          <TradePanel
            key={`trade-panel-${activeTrade.id}`}
            socket={socket}
            trade={activeTrade}
            charId={selectedCharacter}
            inventory={displayedGameState.state.inventory}
            currentSilver={displayedGameState.state.silver}
            onClose={() => setActiveTrade(null)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      <LeaderboardModal
        key="leaderboard-modal"
        isOpen={activeTab === 'leaderboard'}
        onClose={() => setActiveTab('inventory')}
        socket={socket}
        isMobile={isMobile}
        onInspect={handleInspectPlayer}
      />

      <AnimatePresence>
        {pendingPotion && (
          <div key="potion-modal-backdrop" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                background: 'var(--panel-bg)', border: '1px solid var(--border-active)',
                borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '100%',
                textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(174, 0, 255, 0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <Zap size={30} color="#ae00ff" />
              </div>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '800' }}>
                Replace Buff?
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 25px' }}>
                You have an active <strong>Tier {pendingPotion.oldTier}</strong> buff.
                Consuming this <strong>{pendingPotion.name} (T{pendingPotion.newTier})</strong> will cancel the previous effect.
                <br /><br />
                Do you want to proceed?
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setPendingPotion(null)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                    fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    handleUseItem(pendingPotion.itemId, { force: true, qty: pendingPotion.quantity });
                    setPendingPotion(null);
                  }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #ae00ff 0%, #7a00cc 100%)',
                    color: '#fff', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(174, 0, 255, 0.3)'
                  }}
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectData && (
          <InspectModal
            key="inspect-player-modal"
            onClose={handleCloseInspect}
            data={inspectData}
            onItemClick={handleItemClick}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuestModal && (
          <GuestRestrictionModal onClose={() => setShowGuestModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

const actionBtnStyle = {
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.02)',
  padding: '18px 25px',
  borderRadius: '10px',
  color: '#fff',
  cursor: 'pointer',
  transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  textAlign: 'left',
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const ActivityProgressBar = ({ activity, serverTimeOffset = 0 }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!activity) return;

    const update = () => {
      const now = Date.now() + serverTimeOffset;
      const initialQty = activity.initial_quantity || 1;
      const remainingQty = activity.actions_remaining;
      const doneQty = initialQty - remainingQty;
      const timePerAction = activity.time_per_action || 3;

      let currentItemProgressPercent = 0;

      // Calculate progress of current item
      if (activity.next_action_at) {
        const endTime = new Date(activity.next_action_at).getTime();
        const timeRemaining = endTime - now;
        const totalActionTime = timePerAction * 1000;

        // Invert: 0 remaining = 100% done
        const timeDone = totalActionTime - timeRemaining;

        // Clamp between 0 and 1
        const rawProgress = Math.max(0, Math.min(1, timeDone / totalActionTime));
        currentItemProgressPercent = rawProgress;
      }

      // Total Progress = (Done Items + Current Fraction) / Total Items
      // e.g. 5 items done, 0.5 of 6th item done. Total 10.
      // (5 + 0.5) / 10 = 55%

      const realTotalProgress = ((doneQty + currentItemProgressPercent) / initialQty) * 100;
      setProgress(Math.min(100, Math.max(0, realTotalProgress)));
    };

    const interval = setInterval(update, 50); // 20fps for smooth enough bar
    update();

    return () => clearInterval(interval);
  }, [activity, serverTimeOffset]);

  return (
    <div style={{ marginTop: '10px', height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: 'var(--accent)',
        transition: 'width 0.1s linear', // Faster transition for smoother updates
        boxShadow: '0 0 8px var(--accent-soft)'
      }}></div>
      <div style={{ fontSize: '0.6rem', textAlign: 'right', color: '#aaa', marginTop: '2px' }}>
        {progress.toFixed(1)}%
      </div>
    </div>
  );
};

const GuestRestrictionModal = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 11000, padding: '20px'
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-active)',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative background element */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,107,0.1) 0%, transparent 70%)',
          zIndex: 0
        }} />

        <div style={{
          width: '80px', height: '80px', borderRadius: '20px',
          background: 'rgba(255, 107, 107, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 25px',
          border: '1px solid rgba(255, 107, 107, 0.2)',
          boxShadow: '0 10px 20px rgba(255, 107, 107, 0.1)',
          position: 'relative', zIndex: 1
        }}>
          <Lock size={40} color="#ff6b6b" />
        </div>

        <h2 style={{
          margin: '0 0 15px',
          color: 'var(--text-main)',
          fontSize: '1.8rem',
          fontWeight: '900',
          letterSpacing: '1px',
          position: 'relative', zIndex: 1
        }}>
          FEATURE LOCKED
        </h2>

        <p style={{
          color: 'var(--text-dim)',
          fontSize: '1rem',
          lineHeight: '1.6',
          margin: '0 0 30px',
          position: 'relative', zIndex: 1
        }}>
          Marketplace, Trading and Daily Spin are premium features reserved for permanent accounts.
          <br /><br />
          <strong style={{ color: 'var(--text-main)' }}>Link your account now</strong> to protect your progress and join the player economy!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(238, 82, 83, 0.4)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            GOT IT
          </button>

          <button
            onClick={() => {
              onClose();
              // The user can find the link button in Profile
              document.querySelector('[data-tab="profile"]')?.click();
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            GO TO PROFILE
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
