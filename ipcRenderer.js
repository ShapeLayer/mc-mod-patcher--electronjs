const { ipcRenderer, ipcMain } = require('electron')

let body = document.getElementsByTagName('body')[0]
let playbtnStatus = true
let isLatestClient = false
let launcherIsExists = false

function getUserName () {
    ipcRenderer.send('getUserName')
}

function setPlayButtonStatus (s) {
    if (s == 'enable' && isLatestClient && launcherIsExists) {
        document.getElementById('play-btn').style.display = 'block'
        document.getElementById('play-btn').style.cursor = 'pointer'
        document.getElementById('play-btn-text').innerText = '플레이'
        playbtnStatus = true
    } else if (s == 'disableDisplay') {
        document.getElementById('play-btn').style.display = 'block'
        document.getElementById('play-btn').style.cursor = 'default'
        document.getElementById('play-btn-text').innerText = 'X('
        playbtnStatus = false
    } else {
        document.getElementById('play-btn').style.display = 'none'
        playbtnStatus = false
    }
}

function startLauncher () {
    if (playbtnStatus) ipcRenderer.send('startLauncher')
}

function loadUserConfig () {
    ipcRenderer.send('getUserConfig', 'mc_path')
    ipcRenderer.send('getUserConfig', 'backup_path')
    ipcRenderer.send('getUserConfig', 'mcc_path')
    ipcRenderer.send('getUserConfig', 'java-rams')
    ipcRenderer.send('getUserConfig', 'java-args')
}

function saveUserConfig () {
    let nowConfig = [
        ['mc_path', document.getElementById('config-mc_path').value],
        ['backup_path', document.getElementById('config-backup_path').value],
        ['mcc_path', document.getElementById('config-mcc_path').value],
        ['java-rams', document.getElementById('config-java-rams').value],
        ['java-args', document.getElementById('config-java-args').value]
    ]
    ipcRenderer.send('saveUserConfig', nowConfig)
}

function init () {
    ipcRenderer.send('getUpdateStatus')
    ipcRenderer.send('getLauncherIsExists')
    getUserName()
    loadUserConfig()
}

function closeApp () {
    ipcRenderer.send('closeApp')
}

ipcRenderer.on('throwUserName', (e, name) => {
    if (name) document.getElementById('rt-hello').innerText = name + ', 안녕하세요.'
})
ipcRenderer.on('throwUpdateStatus', (e, s, ...args) => {
    if (s == 'NeedModPackageUpdate') {
        document.getElementById('s-text').innerText = '파일 다운로드 중입니다..'
    } else if (s == 'NeedClientUpdate') {
        document.getElementById('o-notice-bold-text').innerText = '패치 프로그램 업데이트 발견!'
        document.getElementById('o-notice-body-text').innerHTML = '패치 프로그램 업데이트가 발견되었습니다.<br>자세한 내용은 디스코드 방의 #로비의 공지를 참고하세요.'
        setOverlay('notice', 'open')
        isLatestClient = false
        setPlayButtonStatus('disableDisplay')
    }
    else if (s == 'ModPackageUpdateDone') {
        ipcRenderer.send('getUpdateStatus')
    }
    else if (s == 'NowUpdating') {
        document.getElementById('s-now').style.width = (args[0] * 100) + '%'
    }
    else if (s == 'NowBackuping') {
        document.getElementById('s-text').innerText = '백업 생성 중입니다..'
        document.getElementById('s-now').style.width = '100%'
    }
    else if (s == 'ApplyingPatch') {
        document.getElementById('s-text').innerText = '패치 적용 중입니다..'
        document.getElementById('s-now').style.width = '100%'
    }
    else if (s == 'NoMoreUpdate') {
        isLatestClient = true
        setPlayButtonStatus('enable')
        document.getElementById('s-text').innerText = '최신 버전입니다.'
        document.getElementById('s-now').style.width = '100%'
        ipcRenderer.send('getUserConfig', 'java-args')
    }
})
ipcRenderer.on('throwUserConfig', (e, cfgName, cfg) => {
    if (cfgName == 'mc_path') {
        document.getElementById('config-mc_path').value = cfg
    } else if (cfgName == 'backup_path') {
        document.getElementById('config-backup_path').value = cfg
    } else if (cfgName == 'mcc_path') {
        document.getElementById('config-mcc_path').value = cfg
    } else if (cfgName == 'java-rams') {
        document.getElementById('config-java-rams').value = cfg
    } else if (cfgName == 'java-args') {
        document.getElementById('config-java-args').value = cfg
    }
})
ipcRenderer.on('throwLauncherIsExists', (e, isExists) => {
    if (isExists) {
        launcherIsExists = true
    } else {
        launcherIsExists = false
        document.getElementById('o-notice-bold-text').innerText = '공식 마인크래프트 런처 미확인'
        document.getElementById('o-notice-body-text').innerHTML = '공식 마인크래프트 런처를 찾을 수 없습니다.<br>마인크래프트 런처를 설치하거나 설정을 변경하세요.'
        setOverlay('notice', 'open')
        // 설정 변경후 리로드 처리 추가해야함
    }
    setPlayButtonStatus('enable')
})
ipcRenderer.on('throwSaveUserConfigDone', (e, isSucceed) => {
    loadUserConfig()
})

init()