/**
 * TikTok & Douyin Extension SDK — Data Parser
 * Extracts metadata, author info, statistics, and clean video download URLs (No Watermark)
 */

export class TikTokParser {
  /**
   * Trích xuất videoId từ URL TikTok hoặc Douyin
   * @param {string} url 
   */
  static parseVideoId(url) {
    if (!url) return null;

    // Dạng TikTok web: https://www.tiktok.com/@user/video/7234567890123456789
    const ttMatch = url.match(/\/video\/(\d+)/);
    if (ttMatch) return { platform: 'tiktok', id: ttMatch[1] };

    // Dạng Douyin web: https://www.douyin.com/video/7234567890123456789
    const dyMatch = url.match(/douyin\.com\/video\/(\d+)/);
    if (dyMatch) return { platform: 'douyin', id: dyMatch[1] };

    // ID trực tiếp nếu truyền vào số thuần
    if (/^\d{15,22}$/.test(url.trim())) {
      return { platform: 'tiktok', id: url.trim() };
    }

    return null;
  }

  /**
   * Chuẩn hóa chi tiết video TikTok từ /api/item/detail/
   */
  static parseTiktokDetail(rawData) {
    const item = rawData?.itemInfo?.itemStruct || rawData?.itemStruct || rawData;
    if (!item) {
      throw new Error('Dữ liệu video TikTok không hợp lệ hoặc đã bị ẩn');
    }

    const id = String(item.id || item.aweme_id || item.itemId || item.vid || '');
    const video = item.video || {};
    const author = item.author || {};
    const stats = item.stats || item.statistics || {};
    const music = item.music || {};

    // Tìm URL video không logo (No Watermark)
    let cleanVideoUrl = video.playAddr || video.downloadAddr || video.play_addr?.url_list?.[0] || '';
    if (!cleanVideoUrl && video.bitrateInfo && video.bitrateInfo.length > 0) {
      cleanVideoUrl = video.bitrateInfo[0]?.PlayAddr?.UrlList?.[0] || '';
    }

    return {
      id: id || Date.now().toString(),
      platform: 'tiktok',
      description: item.desc || item.title || '',
      createdAt: item.createTime ? new Date(item.createTime * 1000).toISOString() : '',
      video: {
        url: cleanVideoUrl,
        downloadUrl: video.downloadAddr || cleanVideoUrl,
        cover: video.cover || video.originCover || video.cover?.url_list?.[0] || '',
        dynamicCover: video.dynamicCover || '',
        duration: video.duration || 0,
        ratio: video.ratio || '720p',
        width: video.width || 0,
        height: video.height || 0,
      },
      author: {
        id: author.id || author.uid || '',
        uniqueId: author.uniqueId || author.unique_id || author.short_id || '',
        nickname: author.nickname || '',
        avatar: author.avatarThumb || author.avatarMedium || author.avatar_thumb?.url_list?.[0] || '',
        verified: author.verified || false,
      },
      stats: {
        views: stats.playCount || stats.play_count || stats.views || 0,
        likes: stats.diggCount || stats.digg_count || stats.likes || 0,
        shares: stats.shareCount || stats.share_count || 0,
        comments: stats.commentCount || stats.comment_count || 0,
        collects: stats.collectCount || stats.collect_count || 0,
      },
      music: {
        title: music.title || '',
        author: music.authorName || '',
        playUrl: music.playUrl || '',
      },
      raw: item,
    };
  }

  /**
   * Chuẩn hóa chi tiết video Douyin từ /aweme/v1/web/aweme/detail/
   */
  static parseDouyinDetail(rawData) {
    const item = rawData?.aweme_detail || rawData;
    if (!item || !item.aweme_id) {
      throw new Error('Dữ liệu video Douyin không hợp lệ');
    }

    const video = item.video || {};
    const author = item.author || {};
    const stats = item.statistics || {};

    // URL không logo của Douyin: thay thế playwm thành play
    let playUrl = video.play_addr?.url_list?.[0] || '';
    if (playUrl.includes('playwm')) {
      playUrl = playUrl.replace('playwm', 'play');
    }

    return {
      id: item.aweme_id,
      platform: 'douyin',
      description: item.desc || '',
      video: {
        url: playUrl,
        cover: video.cover?.url_list?.[0] || '',
        duration: Math.round((video.duration || 0) / 1000),
        width: video.width || 0,
        height: video.height || 0,
      },
      author: {
        id: author.uid,
        uniqueId: author.unique_id || author.short_id,
        nickname: author.nickname || '',
        avatar: author.avatar_thumb?.url_list?.[0] || '',
      },
      stats: {
        likes: stats.digg_count || 0,
        comments: stats.comment_count || 0,
        shares: stats.share_count || 0,
        collects: stats.collect_count || 0,
      },
      raw: item,
    };
  }

  /**
   * Chuẩn hóa kết quả tìm kiếm video từ TikTok Web Search
   */
  static parseTiktokSearchResults(rawData) {
    const list = rawData?.data || rawData?.item_list || rawData?.itemList || rawData?.items || [];
    const results = [];

    for (const entry of list) {
      const item = entry.item || entry.aweme_info || entry.awemeInfo || (entry.video || entry.desc || entry.id ? entry : null);
      if (item) {
        try {
          results.push(this.parseTiktokDetail(item));
        } catch (e) {
          // Fallback parsing nếu cấu trúc đặc biệt
          const id = String(item.id || item.aweme_id || Date.now());
          results.push({
            id,
            platform: 'tiktok',
            description: item.desc || item.title || '',
            video: {
              url: item.video?.playAddr || item.video?.downloadAddr || '',
              cover: item.video?.cover || item.video?.originCover || '',
            },
            author: {
              nickname: item.author?.nickname || item.author?.uniqueId || 'Creator',
              uniqueId: item.author?.uniqueId || '',
            },
            stats: {
              views: item.stats?.playCount || 0,
              likes: item.stats?.diggCount || 0,
            },
            raw: item,
          });
        }
      }
    }

    return results;
  }
}
