export function getList(url, data, callback) {
    $.ajax({
        headers: {
            'token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            'range':AppX.appConfig.range
        },
        data: data,
        type: 'post',
        url: url,
        success: callback
    });
}