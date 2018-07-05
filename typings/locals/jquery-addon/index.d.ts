interface JQueryStatic {
    jeDate(selector: string, obj: any): JQuery;
    nowDate(params: any): any;
}

declare var jQuery: JQueryStatic;
declare var $: JQueryStatic;