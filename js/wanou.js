// ignore
//@version:1
//@webSite:http://wogg.xxooo.cf
//@remark:
//@order: B
// ignore
const appConfig = {
    __webSite: [
        "https://wogg.xxooo.cf",
        "https://wogg.333232.xyz",
        "https://woggpan.333232.xyz",
        "https://wogg.heshiheng.top",
        "https://www.wogg.one",
        "https://www.wogg.lol"
    ],
    _currentDomainIndex: 0,
    _maxRetries: 2, // 单域名最大重试次数

    // 动态获取当前域名（随机选择避免单点负载）
    get webSite() {
        return this._multiDomains[this._currentDomainIndex];
    },

    // 域名轮换（失败时触发）
    rotateDomain() {
        this._currentDomainIndex = (this._currentDomainIndex + 1) % this._multiDomains.length;
        console.warn(`域名切换至: ${this.webSite}`);
    },

    // 域名健康检查（定时执行）
    async checkHealth() {
        for (let i = 0; i < this._multiDomains.length; i++) {
            try {
                await fetch(`${this._multiDomains[i]}/health-check`, {
                    timeout: 3000
                });
            } catch {
                this._multiDomains.splice(i, 1); // 移除失效域名
                if (this._currentDomainIndex >= i) this.rotateDomain();
            }
        }
    }
};
// 每30分钟检查域名健康
setInterval(() => appConfig.checkHealth(), 1800_000);


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
            type_id: '44',
            type_name: '臻彩视界',
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
    const backData = new RepVideoList();
    try {
        backData.data = await safeRequest(
            `/vodshow/${args.url}--------${args.page}---.html`,
            html => {
                const $ = cheerio.load(html);
                return $('#main .module-item').map((_, e) => {
                    return {
                        vod_id: $(e).find('.module-item-pic a').attr('href'),
                        vod_name: $(e).find('.module-item-pic img').attr('alt'),
                        vod_pic: $(e).find('.module-item-pic img').attr('data-src'),
                        vod_remarks: $(e).find('.module-item-text').text()
                    };
                }).get();
            }
        );
    } catch (error) {
        backData.error = error.message;
    }
    return JSON.stringify(backData);
}


/**
 * 获取视频详情
 * @param {UZArgs} args
 * @returns {Promise<RepVideoDetail>}
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        let webUrl = UZUtils.removeTrailingSlash(appConfig.webSite) + args.url
        let pro = await req(webUrl)

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

                if (key.includes('年代')) {
                    vodDetail.vod_year = value.trim()
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
        backData.error = '获取视频详情失败' + error
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
        let searchUrl = combineUrl(
            'vodsearch/' +
            args.searchWord +
            '----------' +
            args.page +
            '---.html'
        )
        let repData = await req(searchUrl)

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
        backData.error = error
    }
    return JSON.stringify(backData)
}

function combineUrl(url) {
    if (url === undefined) {
        return ''
    }
    if (url.indexOf(appConfig.webSite) !== -1) {
        return url
    }
    if (url.startsWith('/')) {
        return appConfig.webSite + url
    }
    return appConfig.webSite + '/' + url
}