// ignore
//@version:1
//@webSite:https://vip.omii.top
//@remark:
//@order: B
// ignore
const appConfig = {
    // 域名数组（支持多个备用域名）
    domains: [
        "https://wogg.xxooo.cf",
        "https://wogg.333232.xyz",
        "https://woggpan.333232.xyz",
        "https://wogg.heshiheng.top",
        "https://www.wogg.one",
        "https://www.wogg.lol"
    ],
    // 当前域名索引
    currentDomainIndex: 0,

    /**
     * 获取当前域名
     */
    get currentDomain() {
        return this.domains[this.currentDomainIndex];
    },

    /**
     * 轮询切换到下一个域名
     */
    rotateDomain() {
        this.currentDomainIndex = (this.currentDomainIndex + 1) % this.domains.length;
        console.log('切换到域名:', this.currentDomain);
    },

    _uzTag: '',
    /**
     * 扩展标识，初次加载时，uz 会自动赋值，请勿修改
     * 用于读取环境变量
     */
    get uzTag() {
        return this._uzTag
    },
    set uzTag(value) {
        this._uzTag = value
    },
}

/**
 * 支持多域名的请求封装
 * @param {string} path 请求路径（相对路径）
 * @param {number} maxRetries 最大重试次数（默认等于域名数量）
 * @returns 请求结果
 */
async function multiDomainReq(path, maxRetries = appConfig.domains.length) {
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        const fullUrl = UZUtils.removeTrailingSlash(appConfig.currentDomain) + path;

        try {
            const response = await req(fullUrl);
            // 请求成功直接返回
            if (!response.error) return response;

            // 如果有错误信息，记录并重试
            lastError = response.error;
            console.warn(`请求失败 (${fullUrl}): ${response.error}`);
        } catch (error) {
            lastError = error;
            console.error(`请求异常 (${fullUrl}):`, error);
        }

        // 切换到下一个域名
        appConfig.rotateDomain();
    }

    // 所有重试都失败
    throw new Error(`所有域名请求均失败: ${lastError || '未知错误'}`);
}

/**
 * 异步获取分类列表的方法。
 * @param {UZArgs} args
 * @returns {Promise<RepVideoClassList>}
 */
async function getClassList(args) {
    var backData = new RepVideoClassList()
    backData.data = [{
            type_id: '1',
            type_name: '电影',
            hasSubclass: false,
        },
        {
            type_id: '2',
            type_name: '剧集',
            hasSubclass: false,
        },
        {
            type_id: '3',
            type_name: '动漫',
            hasSubclass: false,
        },
        {
            type_id: '4',
            type_name: '综艺',
            hasSubclass: false,
        },
        {
            type_id: '6',
            type_name: '短剧',
            hasSubclass: false,
        },
    ]
    return JSON.stringify(backData)
}
async function getSubclassList(args) {
    let backData = new RepVideoSubclassList()
    return JSON.stringify(backData)
}
async function getSubclassVideoList(args) {
    var backData = new RepVideoList()
    return JSON.stringify(backData)
}
/**
 * 获取分类视频列表
 * @param {UZArgs} args
 * @returns {Promise<RepVideoList>}
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    let path = `/index.php/vod/show/id/${args.url}/page/${args.page}.html`

    try {
        const pro = await multiDomainReq(path)
        backData.error = pro.error
        let videos = []
        if (pro.data) {
            const $ = cheerio.load(pro.data)
            let vodItems = $('#main .module-item')
            vodItems.each((_, e) => {
                let videoDet = new VideoDetail()
                videoDet.vod_id = $(e).find('.module-item-pic a').attr('href')
                videoDet.vod_name = $(e)
                    .find('.module-item-pic img')
                    .attr('alt')
                videoDet.vod_pic = $(e)
                    .find('.module-item-pic img')
                    .attr('data-src')
                videoDet.vod_remarks = $(e).find('.module-item-text').text()
                videoDet.vod_year = $(e)
                    .find('.module-item-caption span')
                    .first()
                    .text()
                videos.push(videoDet)
            })
        }
        backData.data = videos
    } catch (error) {
        backData.error = error.message
    }
    return JSON.stringify(backData)
}

/**
 * 获取视频详情
 * @param {UZArgs} args
 * @returns {Promise<RepVideoDetail>}
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        let pro = await multiDomainReq(args.url)

        backData.error = pro.error
        let proData = pro.data
        if (proData) {
            const $ = cheerio.load(proData)
            let vodDetail = new VideoDetail()
            vodDetail.vod_id = args.url
            vodDetail.vod_name = $('.page-title')[0].children[0].data
            vodDetail.vod_pic = $($('.mobile-play')).find(
                '.lazyload'
            )[0].attribs['data-src']

            let video_items = $('.video-info-itemtitle')

            for (const item of video_items) {
                let key = $(item).text()

                let vItems = $(item).next().find('a')
                let value = vItems
                    .map((i, el) => {
                        let text = $(el).text().trim() // 获取并去除空白字符
                        return text ? text : null // 只有非空的文本才返回
                    })
                    .get() // 将 jQuery 对象转换为普通数组
                    .filter(Boolean) // 过滤掉 null 和空字符串
                    .join(', ') // 用逗号和空格分割

                if (key.includes('剧情')) {
                    vodDetail.vod_content = $(item)
                        .next()
                        .find('p')
                        .text()
                        .trim()
                } else if (key.includes('导演')) {
                    vodDetail.vod_director = value.trim()
                } else if (key.includes('主演')) {
                    vodDetail.vod_actor = value.trim()
                }
            }

            const panUrls = []
            let items = $('.module-row-info')
            for (const item of items) {
                let shareUrl = $(item).find('p')[0].children[0].data
                panUrls.push(shareUrl)
            }
            vodDetail.panUrls = panUrls
            console.log(panUrls)

            backData.data = vodDetail
        }
    } catch (error) {
        backData.error = '获取视频详情失败: ' + error.message
    }

    return JSON.stringify(backData)
}

/**
 * 获取视频的播放地址
 * @param {UZArgs} args
 * @returns {Promise<RepVideoPlayUrl>}
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    return JSON.stringify(backData)
}

/**
 * 搜索视频
 * @param {UZArgs} args
 * @returns {Promise<RepVideoList>}
 */
async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        let path = `/index.php/vod/search/page/${args.page}/wd/${encodeURIComponent(args.searchWord)}.html`
        let repData = await multiDomainReq(path)
        const $ = cheerio.load(repData.data)
        let items = $('.module-search-item')

        for (const item of items) {
            let video = new VideoDetail()
            video.vod_id = $(item).find('.video-serial')[0].attribs.href
            video.vod_name = $(item).find('.video-serial')[0].attribs.title
            video.vod_pic = $(item).find('.module-item-pic > img')[0].attribs[
                'data-src'
            ]
            video.vod_remarks = $($(item).find('.video-serial')[0]).text()
            backData.data.push(video)
        }
    } catch (error) {
        backData.error = error.message
    }
    return JSON.stringify(backData)
}