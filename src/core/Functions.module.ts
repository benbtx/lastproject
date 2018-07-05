/*** 以下皆为通用的功能性函数 ***/

/*** url 操作函数 ***/
/**
* 用于向字符串首部添加一个/符号,若存在,则不添加
* @method addFirstSlash
* @for (所属类名)
* @param {string} string 传入待处理的字符串
* @return {string} 处理完成的字符串,头部一定有且仅有一个/
*/
export function addFirstSlash(string: string) {
    return string[0] === "/" ? string : "/" + string;
}

/**
* 移除末尾的 /
* @method removeLastSlash
* @for (所属类名)
* @param {string} string 待处理字符串
* @return {string} 已移除末尾的 / 符号的字符串
*/
export function removeLastSlash(string: string) {
    return string.replace(/\/+$/, "");
}

/**
* 将两个url进行合并
* @method concatUrl
* @for (所属类名)
* @param {string} frontUrl 前半段url
* @param {string} behindUrl 后部分url
* @return {string} 将两个url进行合并并正确添加/符号的新url
*/
export function concatUrl(frontUrl: string, behindUrl: string) {
    return this.removeLastSlash(frontUrl) + this.addFirstSlash(behindUrl);
}

/*** 操作控制函数 ***/
/**
* Description:计数用的,当加或减操作使得计数器为0时,触发绑定的回调函数
* @class CountToRun
*/
export class CountToRun {
    private count: number = 0;
    private callback: Function = null;
    private scope: Object = null;

    constructor(callback?: Function, scope?: Object) {
        callback ? this.callback = callback : null;
        scope ? this.scope = scope : null;
    }

    setCallback(callback) {
        this.callback = callback;
    }

    setScope(scope) {
        scope ? this.scope = scope : null;
    }

    setCount(count:number){
        this.count = count;
    }

    getCount() {
        return this.count;
    }

    plus() {
        if (++(this.count) === 0) {
            this.emit();
        }
    }

    minus() {
        if (--(this.count) === 0) {
            this.emit();
        }
    }

    emit() {
        if (this.scope) {
            this.callback.bind(this.scope)();
        } else {
            this.callback();
        }
    }

}
    
/*** 将Date转化为指定格式的String
*月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
*年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
*DateFormat(date,"yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
*DateFormat(date,"yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
* @method DateFormat
* @param {Date} date 日期
* @param {string} fmt 格式字符串
* @return {string} 将两个url进行合并并正确添加/符号的新url
*/
   export function DateFormat(date:Date,fmt:string) { 
    var o = {
        "M+": date.getMonth() + 1, //月份 
        "d+": date.getDate(), //日 
        "h+": date.getHours(), //小时 
        "m+": date.getMinutes(), //分 
        "s+": date.getSeconds(), //秒 
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
        "S": date.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
    }