/**
 * static.js — All static data constants.
 *
 * FIX: Previously spread across index.html as bare global var declarations
 * mixed with render functions and network code. Now in one place.
 *
 * FIX BUG-10: Fallback video IDs are defined in videos.js (canonical).
 *              This file contains non-video static data only.
 */

export const GUIDES = [
  { id: 1, tag: 'Guide', emoji: '🏦', title: 'How to Complete the Portsands Heist — Step by Step', excerpt: 'Full setup guide: crew selection, approach route, loadout, and getaway. Includes fail-state recovery tips.', time: '3h ago', views: '44K', likes: 601 },
  { id: 2, tag: 'Guide', emoji: '💵', title: 'Best Job Loop for Fast Cash in GTA 6 Online', excerpt: 'Top money-making rotation based on testing. Maximize hourly income with this exact sequence.', time: '1d ago', views: '98K', likes: 1872 },
  { id: 3, tag: 'Guide', emoji: '🗺️', title: 'All 30 Hidden Items in Vice City — Treasure Hunt', excerpt: 'Collect all 30 items for a $500K in-game reward. Full map with timestamps.', time: '2d ago', views: '61K', likes: 945 },
];

export const MODS = [
  { id: 1, cat: 'visual',    name: 'Ultra Realism ENB',     desc: 'Photorealistic lighting, reflections and color grading for GTA 6 PC.', dl: '124K', ver: 'v2.3.1', icon: '🌅' },
  { id: 2, cat: 'gameplay',  name: 'Realistic Traffic AI',  desc: 'Drivers follow real traffic laws, react to weather, and use turn signals.', dl: '87K', ver: 'v2.1.0', icon: '🚗' },
  { id: 3, cat: 'vehicle',   name: '2026 Supercar Pack',    desc: 'Adds 40 supercars with custom handling and engine sounds.', dl: '203K', ver: 'v1.5.2', icon: '🏎️' },
  { id: 4, cat: 'weapon',    name: 'Military Weapons DLC',  desc: '15 military-grade weapons with realistic ballistics and sounds.', dl: '156K', ver: 'v3.0.1', icon: '🔫' },
  { id: 5, cat: 'gameplay',  name: 'Dynamic Weather System',desc: 'Hurricanes, floods, and heat waves that affect gameplay.', dl: '72K',  ver: 'v1.2.0', icon: '⛈️' },
  { id: 6, cat: 'visual',    name: '4K Texture Overhaul',   desc: 'Complete HD texture replacement for all environments and characters.', dl: '98K', ver: 'v4.0.0', icon: '🖼️' },
];

export const QA = [
  { id: 1, votes: 247, solved: true,  title: 'How do you unlock the helicopter at the start of GTA 6?', excerpt: 'Stuck at the Port district and need to get across fast without unlocking the bridge.', answers: 8,  time: '4h ago' },
  { id: 2, votes: 189, solved: false, title: 'What is the fastest car available before the first open-world segment?', excerpt: 'Looking for speed builds that work in early missions without much grind.', answers: 12, time: '6h ago' },
  { id: 3, votes: 134, solved: true,  title: 'Where is the safe house after completing the third main mission?', excerpt: "The game didn't give me a marker and I'm lost in Vice City downtown.", answers: 5,  time: '12h ago' },
  { id: 4, votes: 98,  solved: false, title: 'Does GTA 6 have a co-op story mode or is it solo only?', excerpt: "Heard rumors about 2-player story but can't find official confirmation.", answers: 3,  time: '1d ago' },
];

export const EARN_TASKS = [
  { icon: '🎬', cls: 'tt-i-watch',  name: 'Watch a full video (80%+)',        earn: '+50–200 TKN', key: 'watch',  secured: true  },
  { icon: '📝', cls: 'tt-i-post',   name: 'Post content or guide',            earn: '+100 TKN',    key: 'post',   secured: false },
  { icon: '✅', cls: 'tt-i-answer', name: 'Answer accepted',                  earn: '+150 TKN',    key: 'answer', secured: false },
  { icon: '📤', cls: 'tt-i-share',  name: 'Share to Instagram (#GTA6HQ)',     earn: '+200 TKN',    key: 'share',  secured: false },
  { icon: '👥', cls: 'tt-i-refer',  name: 'Refer a friend (verified)',        earn: '+500 TKN',    key: 'refer',  secured: false },
  { icon: '🔑', cls: 'tt-i-login',  name: 'Daily login',                      earn: '+25 TKN',     key: 'login',  secured: false },
  { icon: '⬇️', cls: 'tt-i-mod',   name: 'Download a mod',                   earn: '+25 TKN',     key: 'mod',    secured: false },
];

// Maps earn task key → token amount
export const EARN_AMOUNTS = {
  watch: 50, post: 100, answer: 150, share: 200, refer: 500, login: 25, mod: 25,
};

export const TIERS = [
  { cls: 't-bronze',        name: 'Bronze',   pts: '1,000 TKN',  usd: '$0.50',  alt: '$0.60 Amazon',  desc: 'Min threshold' },
  { cls: 't-silver',        name: 'Silver',   pts: '5,000 TKN',  usd: '$2.50',  alt: '$3.00 Amazon',  desc: 'Popular'       },
  { cls: 't-gold active',   name: 'Gold',     pts: '15,000 TKN', usd: '$7.50',  alt: '$9.00 Amazon',  desc: 'Best value'    },
  { cls: 't-platinum',      name: 'Platinum', pts: '50,000 TKN', usd: '$25',    alt: '$30 Amazon',    desc: '+VIP badge'    },
  { cls: 't-diamond',       name: 'Diamond',  pts: '200,000 TKN',usd: '$100',   alt: '$120 Amazon',   desc: '+Sponsorship'  },
];

export const LEADERBOARD = [
  { rank: 1, name: 'ViceCityKing',  pts: 142500, av: '👑' },
  { rank: 2, name: 'LuciaMain99',   pts: 98200,  av: '🔥' },
  { rank: 3, name: 'HeistMaster',   pts: 87400,  av: '💎' },
  { rank: 4, name: 'GTA6Nerd',      pts: 72100,  av: '🎮' },
  { rank: 5, name: 'RockstarFan',   pts: 61800,  av: '⭐' },
];

export const EVENTS = [
  { icon: '🚀', name: 'GTA 6 Release — Console',      time: 'Nov 19, 2026'          },
  { icon: '🎮', name: 'GTA6HQ Launch Watch Party',    time: 'Discord — Nov 19, 2026' },
  { icon: '💰', name: 'Double Token Weekend',         time: 'Nov 14–16, 2026'        },
  { icon: '🏆', name: 'Monthly Leaderboard Reset',    time: 'Oct 31, 2026'           },
];

export const SYS_REQ = [
  { tier: 'minimum',     label: 'Minimum',     icon: '🟡', desc: '1080p Low, ~30 fps', specs: [
    { l: 'OS',      v: 'Windows 10 64-bit (22H2+)'                              },
    { l: 'CPU',     v: 'Intel Core i7-8700K / AMD Ryzen 5 3600'                 },
    { l: 'GPU',     v: 'NVIDIA GTX 1660 Super (6GB) / AMD RX 5700 (8GB)'        },
    { l: 'RAM',     v: '16 GB DDR4'                                              },
    { l: 'VRAM',    v: '6 GB minimum'                                            },
    { l: 'Storage', v: '150 GB NVMe SSD (required)'                             },
    { l: 'DirectX', v: 'DirectX 12'                                              },
  ]},
  { tier: 'recommended', label: 'Recommended', icon: '🟠', desc: '1080p–1440p High, ~60 fps', specs: [
    { l: 'OS',      v: 'Windows 11 64-bit'                                       },
    { l: 'CPU',     v: 'Intel Core i7-12700K / AMD Ryzen 7 5800X3D'             },
    { l: 'GPU',     v: 'NVIDIA RTX 3080 (10GB) / AMD RX 6800 XT (16GB)'         },
    { l: 'RAM',     v: '32 GB DDR5'                                              },
    { l: 'VRAM',    v: '10–16 GB'                                                },
    { l: 'Storage', v: '150 GB NVMe SSD + DirectStorage'                        },
    { l: 'DirectX', v: 'DirectX 12 Ultimate'                                     },
  ]},
  { tier: 'ultra',       label: 'Ultra / 4K',  icon: '🔵', desc: '4K Ultra + Ray Tracing, 60+ fps', specs: [
    { l: 'OS',      v: 'Windows 11 64-bit'                                       },
    { l: 'CPU',     v: 'Intel Core i9-13900K / AMD Ryzen 9 7950X3D'             },
    { l: 'GPU',     v: 'NVIDIA RTX 4080 / RTX 4090 (16–24GB VRAM)'              },
    { l: 'RAM',     v: '32–64 GB DDR5'                                           },
    { l: 'VRAM',    v: '16 GB+ (ray tracing hungry)'                             },
    { l: 'Storage', v: '150 GB NVMe SSD (PCIe 4.0+)'                            },
    { l: 'DirectX', v: 'DirectX 12 Ultimate + DLSS 3.5'                         },
  ]},
];

export const CONSOLES = [
  { name: 'PlayStation 5', icon: '🎮', specs: 'AMD Zen 2 CPU (8-core) · AMD RDNA 2 GPU (10.3 TFLOPS) · 16 GB GDDR6 · 825 GB NVMe SSD · 4K / 60fps target' },
  { name: 'Xbox Series X', icon: '🎮', specs: 'AMD Zen 2 CPU (8-core) · AMD RDNA 2 GPU (12 TFLOPS) · 16 GB GDDR6 · 1 TB NVMe SSD · 4K / 60fps target'     },
];
