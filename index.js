const fetch = require('superagent');

const base_url = "https://api.gettr.com";
const media_url = "https://media.gettr.com"

class GettrClient {
    /**
     * @param {string} username 
     * @param {string} token 
     */
    constructor(username, token) {
        this.username = username;
        this.token = token;
    }

    /**
     * @param {string} username
     * @returns {?Promise<User|ClientUser>}
     */
    async getUser(username) {

        const response = await fetch(`${base_url}/s/uinf/${username}`)
            .set('x-app-auth', `{"user": "${this.username}", "token": "${this.token}"}`)
            .catch((e) => e)
        const data = response.body.result.data;

        if (response.status != 200) return null;
        
        return ((data.username == this.username) ? new ClientUser(data, this) : new User(data, this));
    }

    /**
     * @param {string} id
     * @returns {?Promise<Post>}
     */
    async getPost(id) {
        const response = await fetch(`${base_url}/u/post/${id}?incl=poststats|shared|liked`).catch((e) => e)
        const data = response.body.result.data;

        if (response.status != 200) return null;
        
        return (new Post(data, this));
    }

    /**
     * @param {string} query
     * @param {max} number
     * @returns {?Promise<Post[]>}
     */
    async searchPost(query, max = 20) {
        const response = await fetch(`${base_url}/u/posts/srch/phrase?max=${max}&q=${query}`).catch((e) => e)
        var posts = [];

        if (response.status != 200 || !response.body.result.aux) return null;
        
        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @param {string} query
     * @param {max} number
     * @returns {?Promise<User[]>}
     */
    async searchUser(query, max = 20) {
        const response = await fetch(`${base_url}/u/users/srch/phrase?max=${max}&q=${query}&incl=userinfo`).catch((e) => e)
        var users = [];

        if (response.status != 200 || !response.body.result.aux) return null;
        
        for (const [key, value] of Object.entries(response.body.result.aux.uinf)) {
            users.push(new User(value, this));
        }
        return ((users) ? users : null);
    }

    /**
     * @returns {?Promise<Suggestion[]>}
     */
    async getTrendings() {
        const response = await fetch(`${base_url}/s/hashtag/suggest`).catch((e) => e)
        var suggests = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.htinfo)) {
            suggests.push(new Suggestion(value, this));
        }
        return ((suggests) ? suggests : null);
    }

    /**
     * @returns {?Promise<User[]>}
     */
    async getPeoples() {
        const response = await fetch(`${base_url}/s/usertag/suggest?offset=0&max=20&incl=userinfo|followings`).catch((e) => e)
        var users = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.uinf)) {
            users.push(new User(value, this));
        }
        return ((users) ? users : null);
    }

    /**
     * @returns {?Promise<Post[]>}
     */
    async getLiveNow() {
        const response = await fetch(`${base_url}/u/posts/livenow?incl=posts|stats|userinfo|shared|liked&lang=all&offset=0&max=20`)
            .set('x-app-auth', `{"user": "${this.username}", "token": "${this.token}"}`)
            .catch((e) => e)
        var posts = [];

        if (response.status != 200) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @returns {?Promise<Post[]>}
     */
    async getTimeline() {
        const response = await fetch(`${base_url}/u/user/${this.username}/timeline?offset=0&max=20&incl=posts|stats|userinfo|shared|liked`)
            .set('x-app-auth', `{"user": "${this.username}", "token": "${this.token}"}`)
            .catch((e) => e)
        var posts = [];
        
        if (response.status != 200) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @returns {?Promise<User[]>}
     */
    async getRecommends() {
        const response = await fetch(`${base_url}/s/usertag/recommend?max=40&incl=userinfo|followings|followers`)
            .set('x-app-auth', `{"user": "${this.username}", "token": "${this.token}"}`)
            .catch((e) => e)
        var users = [];
        
        if (response.status != 200) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.uinf)) {
            users.push(new User(value, this));
        }
        return ((users) ? users : null);
    }

    /**
     * @param {string} message
     * @returns {?Promise<Post>}
     */
    async post(message) {
        await fetch.options("https://api.gettr.com/u/post")
            .accept('*/*')
            .send('null');
        
        const request = await fetch.post("https://api.gettr.com/u/post")
            .accept('application/json, text/plain, */*')
            .set({
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundarytliwPGCJQkd0A5PT',
                'x-app-auth': '{"user": "' + this.username + '", "token": "' + this.token + '"}'
            })
            .send('------WebKitFormBoundarytliwPGCJQkd0A5PT\r\nContent-Disposition: form-data; name="content"\r\n\r\n{"data":{"acl":{"_t":"acl"},"_t":"post","txt":"' + message + '","udate":1645955475923,"cdate":1645955475923,"uid":"' + this.username + '"},"aux":null,"serial":"post"}\r\n------WebKitFormBoundarytliwPGCJQkd0A5PT--\r\n')
            .catch((e) => e)

        if (request.status != 200) return null;
        
        return (new Post(request.body.result.data, this));
    }
}

class Post {
    /**
     * @param {object} data 
     * @param {GettrClient} Client
     */
    constructor(data, Client) {
        /**
         * @type {?string}
         */
        this.id = (data._id) ? data._id : (data.pid) ? data.pid : null;
        /**
         * @type {?string}
         */
        this.content = (data.txt) ? data.txt : null;
        /**
         * @type {?string}
         */
        this.mediaPreview = (data.main) ? `${media_url}/${data.main}` : (data.imgs) ? `${media_url}/${data.imgs[0]}` : null;
        /**
         * @type {?{url: string, url_comp: string, width: number, height: number, duration:number}}
         */
        this.video = (data.ovid || data.vid) ? { url: `${(data.vid.startsWith('https://stream.video.gettr.com')) ? data.vid : media_url + '/' + data.ovid}`, url_comp: `${(data.vid.startsWith('https://stream.video.gettr.com')) ? data.vid : media_url + '/' + data.vid}`, width: parseInt(data.vid_wid), height: parseInt(data.vid_hgt), duration: parseFloat(data.vid_dur) } : null;
        /**
         * @type {?Array<string>}
         */
        this.images = (data.imgs) ? data.imgs.map(img => `${media_url}/${img}`) : null;
        /**
         * @type {?Array<string>}
         */
        this.hashtags = (data.htgs) ? data.htgs : null;
        /**
         * @type {?Array<string>}
         */
        this.usertags = (data.utgs) ? data.utgs : null;
        /**
         * @type {?{url: string, img: string, title: string, description: string}}
         */
        this.website = (data.prevsrc) ? { url: data.prevsrc, img: data.previmg, title: data.ttl, description: data.dsc } : null;
        /**
         * @type {?string}
         */
        this.language = (data.txt_lang) ? data.txt_lang : null;
        /**
         * @type {number}
         */
        this.likes = (data.lkbpst) ? data.lkbpst : (data.lkbcm) ? data.lkbcm : 0;
        /**
         * @type {number}
         */
        this.reposted = (data.shbpst) ? data.shbpst : (data.shbcm) ? data.shbcm : 0;
        /**
         * @type {number}
         */
        this.comments = (data.cm) ? data.cm : 0;
        /**
         * @type {?string}
         */
        this.authorName = (data.uid) ? data.uid : null;
        /**
         * @type {GettrClient}
         */
        this._client = Client;
    }

    /**
     * @returns {?Promise<User>}
     */
    async fetchAuthor() {
        return (await this._client.getUser(this.authorName));
    }

    /**
     * @returns {?Promise<Post[]>}
     */
    async fetchComments() {
        const response = await fetch(`${base_url}/u/post/${this.id}/comments`).catch((e) => e);
        var comments = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.cmt)) {
            comments.push(new Post(value, this._client));
        }
        return ((comments) ? comments : null);
    }

    /**
     * @returns {Promise<Post>}
     */
    async like() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/likes/post/${this.id}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {Promise<Post>}
     */
    async unlike() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/unlike/post/${this.id}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);

        if (request.status != 200) return null;
        
        return (this);
    }

    /**
     * @param {number} id
     * @returns {Promise<Post>}
     */
    async report(id) {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/report/post/${this.id}/rsn${id}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;
        
        return (this);
    }

    /**
     * @returns {?Promise<Post>}
     */
    async delete() {
        const request = await fetch.delete(`${base_url}/u/post/${this.id}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<Post>}
     */
    async pin() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/post/${this.id}/pin`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<Post>}
     */
    async unpin() {
        const request = await fetch.delete(`${base_url}/u/user/${this._client.username}/post/${this.id}/unpin`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {Promise<Post>}
     */
    async repost() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/shares/post/${this.id}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);

        if (request.status != 200) return null;
        
        return (this);
    }

    /**
     * @returns {Promise<Post>}
     */
    async undoRepost() {
        const request = await fetch.delete(`${base_url}/u/user/${this._client.username}/shares/post/${this.id}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);

        if (request.status != 200) return null;
        
        return (this);
    }
}

class Suggestion {
    /**
     * @param {object} data
     * @param {GettrClient} Client
     */
    constructor(data, Client) {
        /**
         * @type {?string}
         */
        this.title = (data.title) ? data.title : null;
        /**
         * @type {?string}
         */
        this.topic = (data.topic) ? data.topic : null;
        /**
         * @type {?string}
         */
        this.category = (data.category) ? data.category : null;
        /**
         * @type {?string}
         */
        this.description = (data.description) ? data.description : null;
        /**
         * @type {?string}
         */
        this.iconUrl = (data.iconUrl) ? data.iconUrl : null;
        /**
         * @type {?string[]}
         */
        this.postId = (data.postId) ? data.postId : null;
        /**
         * @type {?string}
         */
        this.liveUrl = (data.liveUrl) ? data.liveUrl : null;
        /**
         * @type {GettrClient}
         */
        this._client = Client;
    }

    /**
     * @returns {?Promise<Post[]>}
     */
    async fetchPosts() {
        const response = await fetch(`${base_url}/s/hashtag/suggest`).catch((e) => e);
        var posts = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (var i = 0; i < this.postId.length; i++) {
            posts[i] = await this._client.getPost(this.postId[i]);
        }

        return ((posts) ? posts : null);
    }
}

class User {
    /**
     * @param {object} data 
     * @param {GettrClient} Client
     */
    constructor(data, Client) {
        /**
         * @type {?string}
         */
        this.username = (data.username) ? data.username : null;
        /**
         * @type {?string}
         */
        this.nickname = (data.nickname) ? data.nickname : null;
        /**
         * @type {?string}
         */
        this.description = (data.dsc) ? data.dsc : null;
        /**
         * @type {?number}
         */
        this.updatedTimestamp = parseInt(data.udate);
        /**
         * @type {?number}
         */
        this.createdTimestamp = parseInt(data.cdate);
        /**
         * @type {?string}
         */
        this.language = (data.lang) ? data.lang : null;
        /**
         * @type {?string}
         */
        this.location = (data.location) ? data.location : null;
        /**
         * @type {?string}
         */
        this.website = (data.website) ? data.website : null;
        /**
         * @type {number}
         */
        this.twitterFollowers = parseInt(data.twt_flg);
        /**
         * @type {number}
         */
        this.twitterFollowing = parseInt(data.twt_flw);
        /**
         * @type {number}
         */
        this.followers = parseInt(data.flg);
        /**
         * @type {number}
         */
        this.following = parseInt(data.flw);
        /**
         * @type {boolean}
         */
        this.verified = (data.infl) ? true : false;
        /**
         * @type {?string}
         */
        this.avatarUrl = (data.ico) ? `${media_url}/${data.ico}` : null;
        /**
         * @type {?string}
         */
        this.backgroundUrl = (data.bgimg) ? `${media_url}/${data.bgimg}` : null;
        /**
         * @type {number}
         */
        this.likedPosts = parseInt(data.lkspst);
        /**
         * @type {number}
         */
        this.repostedPosts = parseInt(data.shspst);
        /**
         * @type {GettrClient}
         */
        this._client = Client
    }

    /**
     * @param {number} [max=20] - Must be lower or equal to 20
     * @returns {?Promise<Post[]>}
     */
    async fetchPosts(max = 20) {
        const response = await fetch(`${base_url}/u/user/${this.username}/posts?offset=0&max=${max}&incl=posts|stats|userinfo|shared|liked&fp=f_uo`).catch((e) => e);
        var posts = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this._client));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @param {number} [max=20] - Must be lower or equal to 20
     * @returns {?Promise<Post[]>}
     */
    async fetchAnswers(max = 20) {
        const response = await fetch(`${base_url}/u/user/${this.username}/posts?offset=0&max=${max}&incl=posts|stats|userinfo|shared|liked&fp=f_uc`).catch((e) => e);
        var posts = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this._client));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @param {number} [max=20] - Must be lower or equal to 20
     * @returns {?Promise<Post[]>}
     */
    async fetchMedias(max = 20) {
        const response = await fetch(`${base_url}/u/user/${this.username}/posts?offset=0&max=${max}&incl=posts|stats|userinfo|shared|liked&fp=f_um`).catch((e) => e);
        var posts = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this._client));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @param {number} [max=20] - Must be lower or equal to 20
     * @returns {?Promise<Post[]>}
     */
    async fetchLiked(max = 20) {
        const response = await fetch(`${base_url}/u/user/${this.username}/posts?offset=0&max=${max}&incl=posts|stats|userinfo|shared|liked&fp=f_ul`).catch((e) => e);
        var posts = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.post)) {
            posts.push(new Post(value, this._client));
        }
        return ((posts) ? posts : null);
    }

    /**
     * @param {string} username
     * @returns {?Promise<boolean>}
     */
    async isFollowing(username) {
        const response = await fetch(`${base_url}/u/user/${this.username}/follows/${username}`).catch((e) => e);

        if (response.status != 200 || !response.body.result) return null;

        return ((response.body.result == 'y') ? true : false);
    }

    /**
     * @returns {?Promise<User[]>}
     */
    async fetchFollowers() {
        const response = await fetch(`${base_url}/u/user/${this.username}/followers?offset=0`).catch((e) => e);
        var users = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.uinf)) {
            users.push(new User(value, this._client));
        }
        return ((users) ? users : null);
    }

    /**
     * @returns {?Promise<User[]>}
     */
    async fetchFollowing() {
        const response = await fetch(`${base_url}/u/user/${this.username}/followings?offset=0`).catch((e) => e);
        var users = [];

        if (response.status != 200 || !response.body.result.aux) return null;

        for (const [key, value] of Object.entries(response.body.result.aux.uinf)) {
            users.push(new User(value, this._client));
        }
        return ((users) ? users : null);
    }

    /**
     * @returns {?Promise<User>}
     */
    async follow() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/follows/${this.username}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<User>}
     */
    async unfollow() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/unfollows/${this.username}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<User>}
     */
    async mute() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/mutes/${this.username}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<User>}
     */
    async unmute() {
        const request = await fetch.delete(`${base_url}/u/user/${this._client.username}/mutes/${this.username}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<User>}
     */
    async block() {
        const request = await fetch.post(`${base_url}/u/user/${this._client.username}/blocks/${this.username}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }

    /**
     * @returns {?Promise<User>}
     */
    async unblock() {
        const request = await fetch.delete(`${base_url}/u/user/${this._client.username}/blocks/${this.username}`)
            .accept('application/json')
            .set('x-app-auth', `{"user": "${this._client.username}", "token": "${this._client.token}"}`)
            .catch((e) => e);
        
        if (request.status != 200) return null;

        return (this);
    }
}

class ClientUser extends User {
    /**
     * @param {object} data 
     * @param {GettrClient} client 
     */
    constructor(data, client) {
        super(data, client);
        /**
         * @type {?string}
         */
        this.phone = (data.sms) ? data.sms : null;
        /**
         * @type {?string}
         */
        this.email = (data.email) ? data.email : null;
    }
}

module.exports = {
    GettrClient: GettrClient,
    User: User,
    Post: Post,
    ClientUser: ClientUser,
    Suggestion: Suggestion
}