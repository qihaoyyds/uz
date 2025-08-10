// ignore
//@name:「盘」夸克网盘API
//@version:1.0
//@webSite:https://pan.quark.cn
//@remark:夸克网盘文件管理与分享接口
//@order:A

import {} from '../../core/uzUtils.js'

const appConfig = {
    _webSite: 'https://pan.quark.cn',
    get webSite() {
        return this._webSite
    },
    set webSite(value) {
        this._webSite = value
    },

    _uzTag: '',
    get uzTag() {
        return this._uzTag
    },
    set uzTag(value) {
        this._uzTag = value
    },

    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

class QuarkAPI {
    constructor(cookie) {
        this.cookie = cookie
        this.headers = {
            'Cookie': this.cookie,
            'User-Agent': appConfig.UA,
            'Content-Type': 'application/json'
        }
    }

    // 获取文件列表
    async getFileList(folderId = 'root') {
        const url = `${appConfig.webSite}/1/clouddrive/file/sort?pdir_fid=${folderId === 'root' ? '0' : folderId}`
        try {
            const response = await req(url, {
                headers: this.headers
            })
            return response.data?.list || []
        } catch (e) {
            console.error('获取文件列表失败:', e)
            return []
        }
    }

    // 创建分享链接
    async createShareLink(fileId, title, expireDays = 7, password = '') {
        const url = `${appConfig.webSite}/1/clouddrive/share`
        const payload = {
            fid_list: [fileId],
            title: title,
            expire_days: expireDays,
            ...(password && {
                passcode: password
            })
        }

        try {
            const response = await req(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            })
            return response.data?.share_url || ''
        } catch (e) {
            console.error('创建分享失败:', e)
            return ''
        }
    }

    // 转存他人分享
    async saveSharedFiles(shareUrl, password = '', folderId = 'root') {
        const url = `${appConfig.webSite}/1/clouddrive/save`
        const payload = {
            share_url: shareUrl,
            to_pdir_fid: folderId === 'root' ? '0' : folderId,
            ...(password && {
                passcode: password
            })
        }

        try {
            const response = await req(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            })
            return {
                success: response.code === 0,
                taskId: response.data?.task_id || '',
                message: response.msg || '转存成功'
            }
        } catch (e) {
            return {
                success: false,
                message: '转存失败: ' + e.message
            }
        }
    }

    // 上传文件
    async uploadFile(fileData, fileName, folderId = 'root') {
        const url = `${appConfig.webSite}/1/clouddrive/upload`
        const form = new FormData()
        form.append('file', new Blob([fileData]), fileName)
        form.append('to_pdir_fid', folderId === 'root' ? '0' : folderId)

        try {
            const response = await req(url, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Type': 'multipart/form-data'
                },
                body: form
            })
            return response.data?.fid || ''
        } catch (e) {
            console.error('上传失败:', e)
            return ''
        }
    }
}

// 主功能入口
async function main(args) {
    // 从扩展存储获取cookie
    const cookie = await UZUtils.getStorage('quark_cookie')
    if (!cookie) {
        return JSON.stringify({
            error: '未设置夸克网盘Cookie，请先配置'
        })
    }

    const quark = new QuarkAPI(cookie)
    let result = null

    switch (args.action) {
        case 'list':
            result = await quark.getFileList(args.folderId)
            break
        case 'share':
            result = await quark.createShareLink(args.fileId, args.title, args.expireDays, args.password)
            break
        case 'save':
            result = await quark.saveSharedFiles(args.shareUrl, args.password, args.folderId)
            break
        case 'upload':
            // 文件数据应从args获取
            result = await quark.uploadFile(args.fileData, args.fileName, args.folderId)
            break
        default:
            result = {
                error: '未知操作'
            }
    }

    return JSON.stringify(result)
}

// 设置Cookie（用于配置界面）
async function setCookie(args) {
    await UZUtils.setStorage('quark_cookie', args.cookie)
    return JSON.stringify({
        success: true
    })
}