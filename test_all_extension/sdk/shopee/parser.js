/**
 * Shopee Extension SDK — Data Parser & Normalizer
 * Converts raw Shopee JSON responses into clean E-Commerce data objects
 */

import { buildShopeeImageUrl } from './constants.js';

export class ShopeeParser {
  /**
   * Trích xuất itemId và shopId từ bất kỳ URL Shopee nào
   * @param {string} url 
   * @returns {{itemId: string, shopId: string}|null}
   */
  static parseShopeeUrl(url) {
    if (!url) return null;

    try {
      // Dạng 1: https://shopee.vn/product/123456/789012
      const productMatch = url.match(/\/product\/(\d+)\/(\d+)/);
      if (productMatch) {
        return { shopId: productMatch[1], itemId: productMatch[2] };
      }

      // Dạng 2: https://shopee.vn/Ten-San-Pham-i.123456.789012
      const itemMatch = url.match(/-i\.(\d+)\.(\d+)/);
      if (itemMatch) {
        return { shopId: itemMatch[1], itemId: itemMatch[2] };
      }

      // Dạng 3: Query parameters ?itemid=789012&shopid=123456
      const urlObj = new URL(url);
      const itemId = urlObj.searchParams.get('itemid') || urlObj.searchParams.get('itemId') || urlObj.searchParams.get('item_id');
      const shopId = urlObj.searchParams.get('shopid') || urlObj.searchParams.get('shopId') || urlObj.searchParams.get('shop_id');
      if (itemId && shopId) {
        return { shopId, itemId };
      }
    } catch (e) {
      console.warn('Lỗi parse Shopee URL:', e);
    }

    return null;
  }

  /**
   * Chuẩn hóa chi tiết sản phẩm từ response /api/v4/item/get hoặc /api/v4/pdp/get_pc
   * @param {Object} rawData 
   */
  static parseItemDetail(rawData, domain = 'shopee.ph') {
    const item = rawData?.data?.item || rawData?.data || rawData?.item || rawData;
    const itemId = (item.itemid || item.item_id || '').toString();
    const shopId = (item.shopid || item.shop_id || '').toString();

    if (!item || !itemId) {
      throw new Error('Dữ liệu sản phẩm Shopee không hợp lệ (Không tìm thấy itemid)');
    }

    // Xử lý giá tiền (Shopee nhân giá tiền với 100,000)
    const formatPrice = (val) => {
      if (typeof val === 'number' && val > 0) {
        return val > 10000000 ? Math.round(val / 100000) : val;
      }
      return 0;
    };

    const price = formatPrice(item.price || item.price_info?.current_price || item.min_price);
    const priceMin = formatPrice(item.price_min || item.price_info?.min_price || item.price);
    const priceMax = formatPrice(item.price_max || item.price_info?.max_price || item.price);
    const priceBeforeDiscount = formatPrice(item.price_before_discount || item.price_info?.original_price);

    // Danh sách ảnh chất lượng cao
    const rawImages = item.images || item.image_list || (item.image ? [item.image] : []);
    const images = rawImages.map((img) => buildShopeeImageUrl(img, 'origin'));

    // Video sản phẩm nếu có
    let video = null;
    const videoList = item.video_info_list || item.videos || [];
    if (videoList.length > 0) {
      const v = videoList[0];
      video = {
        id: v.video_id,
        duration: v.duration,
        url: v.default_format?.url || v.url || '',
        thumbnail: buildShopeeImageUrl(v.thumb_url || v.cover_url),
      };
    }

    // Thuộc tính sản phẩm (Brand, Material, Xuất xứ...)
    const attributes = (item.attributes || []).map((attr) => ({
      name: attr.name,
      value: attr.value,
    }));

    // Bảng phân loại SKU (Màu sắc, Size, Mẫu mã)
    const variations = (item.tier_variations || []).map((tier) => ({
      name: tier.name,
      options: tier.options,
      images: (tier.images || []).map((img) => buildShopeeImageUrl(img)),
    }));

    // Danh sách models chi tiết từng SKU
    const models = (item.models || []).map((m) => ({
      modelId: m.model_id,
      name: m.name,
      price: formatPrice(m.price),
      stock: m.stock,
      sku: m.sku || '',
    }));

    return {
      itemId: itemId,
      shopId: shopId,
      name: item.name || item.title || '',
      description: item.description || '',
      price: price,
      priceMin: priceMin,
      priceMax: priceMax,
      priceBeforeDiscount: priceBeforeDiscount,
      discountPercent: item.discount || 0,
      currency: item.currency || 'VND',
      stock: item.stock || 0,
      historicalSold: item.historical_sold || item.sold || 0,
      ratingStar: Number((item.item_rating?.rating_star || item.rating_star || 5.0).toFixed(1)),
      ratingCount: item.item_rating?.rating_count?.[0] || item.rating_count || 0,
      images: images,
      coverImage: images[0] || '',
      video: video,
      attributes: attributes,
      tierVariations: variations,
      models: models,
      shopLocation: item.shop_location || '',
      shopeeUrl: `https://${domain}/product/${shopId}/${itemId}`,
      raw: item,
    };
  }

  /**
   * Chuẩn hóa danh sách kết quả tìm kiếm từ /api/v4/search/search_items
   * @param {Object} rawData
   * @param {string} [domain='shopee.ph']
   */
  static parseSearchResults(rawData, domain = 'shopee.ph') {
    const items = rawData?.items || [];
    return items.map((wrapper) => {
      const it = wrapper.item_basic || wrapper;
      const formatPrice = (val) => {
        if (typeof val === 'number' && val > 0) {
          return val > 10000000 ? Math.round(val / 100000) : val;
        }
        return 0;
      };

      return {
        itemId: it.itemid?.toString(),
        shopId: it.shopid?.toString(),
        name: it.name || it.title || '',
        title: it.name || it.title || '',
        price: formatPrice(it.price),
        historicalSold: it.historical_sold || 0,
        ratingStar: Number((it.item_rating?.rating_star || 5.0).toFixed(1)),
        coverImage: buildShopeeImageUrl(it.image, 'origin', domain),
        shopeeUrl: `https://${domain}/product/${it.shopid}/${it.itemid}`,
      };
    });
  }

  /**
   * Chuẩn hóa đánh giá người mua kèm ảnh thực tế từ /api/v2/item/get_ratings
   */
  static parseReviews(rawData) {
    const ratings = rawData?.data?.ratings || [];
    return ratings.map((r) => ({
      ratingId: r.cmtid,
      author: r.author_username || 'Người dùng ẩn danh',
      ratingStar: r.rating_star,
      comment: r.comment || '',
      createdAt: new Date(r.ctime * 1000).toLocaleString('vi-VN'),
      productModel: r.product_items?.[0]?.model_name || '',
      buyerImages: (r.images || []).map((img) => buildShopeeImageUrl(img)),
      buyerVideos: (r.videos || []).map((v) => v.url),
    }));
  }
}
