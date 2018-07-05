/**
 * 
 *  根基类
 *  该类中定义了最基础的类属性以及类结构
 * 
*/

export = Base;

class Base {
    debug = true;
    AppX = window["AppX"] || <any>{};
    root = window["AppX"].root || undefined;

    /*** 以下为对象生命周期函数 ***/

    // 构造函数
    constructor() {
        // this.log('Base Started...');
    }

    // 启动函数
    startup() {

    }

    // 销毁函数
    destroy() { }

    /*** 通用函数 ***/

    // 输出普通信息函数
    // 可以在此做信息重定向显示
    // 以及各种数据采集
    // 保证对程序输出的可控
    log(message?: any, ...optionalParams: any[]) {
        if (this.debug === true) {
            console.log.apply(this, arguments);
        } else {
            // this.bug.apply(this, arguments);
        }
    }

    // 错误信息输出函数
    // 可以在此做信息重定向显示
    // 以及错误信息回传上报
    // 保证对程序错误的及时监控和修复
    bug(message?: any, ...optionalParams: any[]) {
        if (this.debug === true) {
            console.error.apply(this, arguments);
        } else {
            if (this.AppX.runtimeConfig.toast) {
                this.AppX.runtimeConfig.toast.Show(message);
            }
        }
    }

    // 通用的弹框
    alert(message?:string){
        if(message){
            alert(message);
        }
    }
}