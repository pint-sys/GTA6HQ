const fs = require('fs');

function getFallbackVideos() {
  return [
    {id:'vid1',src:'youtube',youtubeId:'QkkoHAzjnUs',cat:'trailer',title:'Grand Theft Auto VI Trailer 1',dur:'1:31',views:'200M',ch:'Rockstar Games',thumb:'https://img.youtube.com/vi/QkkoHAzjnUs/hqdefault.jpg',reward:50},
    {id:'vid2',src:'youtube',youtubeId:'9JETXBi0SYs',cat:'trailer',title:'Grand Theft Auto VI Trailer 2',dur:'2:01',views:'90M',ch:'Rockstar Games',thumb:'https://img.youtube.com/vi/9JETXBi0SYs/hqdefault.jpg',reward:50},
    {id:'vid3',src:'youtube',youtubeId:'KpMXPU1zAAs',cat:'guides',title:'GTA 6 Everything We Know — Full Breakdown',dur:'18:42',views:'4.2M',ch:'MrBossFTW',thumb:'https://img.youtube.com/vi/KpMXPU1zAAs/hqdefault.jpg',reward:50},
    {id:'vid4',src:'youtube',youtubeId:'rEXCNbsNVQ0',cat:'guides',title:'GTA 6 Map Analysis — State of Leonida Explored',dur:'22:15',views:'3.1M',ch:'GTA Series Videos',thumb:'https://img.youtube.com/vi/rEXCNbsNVQ0/hqdefault.jpg',reward:50},
    {id:'vid5',src:'youtube',youtubeId:'odFm6hfDea8',cat:'guides',title:'GTA 6 Jason & Lucia — Full Character Analysis',dur:'14:08',views:'2.8M',ch:'DarkViperAU',thumb:'https://img.youtube.com/vi/odFm6hfDea8/hqdefault.jpg',reward:50},
    {id:'vid6',src:'youtube',youtubeId:'T3PkATlHi_E',cat:'guides',title:'GTA 6 Gameplay Features Confirmed So Far',dur:'16:55',views:'2.3M',ch:'Typical Gamer',thumb:'https://img.youtube.com/vi/T3PkATlHi_E/hqdefault.jpg',reward:50},
  ];
}

async function update() {
  // For now, just use fallback videos
  // You can add YouTube API integration later
  const videos = getFallbackVideos();
  const output = {
    videos: videos,
    news: [], // Keep existing news
    updated: new Date().toISOString()
  };
  
  fs.writeFileSync('news-data.json', JSON.stringify(output, null, 2));
  console.log('✅ Updated videos:', videos.length);
}

update().catch(console.error);
