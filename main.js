const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const request = require('request')
const reqProgress = require('request-progress')
const mv = require('mv')
const unzipper = require('unzipper')
const cheerio = require('cheerio')
const { exec } = require('child_process')

let C
let checkProcessInterval
let win

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    icon: __dirname + '\\' + 'assets/icon.png',
    frame: false,
    resizable: false
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

function getVersion (e) {
  request('https://raw.githack.com/ShapeLayer/aimless.ho9.me/main/aimless.json', (err, res, body) => {
    let infoGetted = JSON.parse(body)
    checkVersion(e, infoGetted)
  })
}

function checkVersion (e, latestVer) {
  //sendVersion(e, 'NeedClientUpdate')
  fs.readFile(__dirname + '\\' + 'version.json', 'utf-8', (err, data) => {
    let localVer = JSON.parse(data)
    if (localVer['client'] < latestVer['client']) {
      sendVersion(e, 'NeedClientUpdate')
    }
    else if (localVer['minecraft']['package'] < latestVer['minecraft']['package']) {
      sendVersion(e, 'NeedModPackageUpdate', localVer['minecraft']['package'])
    }
    else {
      sendVersion(e, 'NoMoreUpdate')
      win.setProgressBar(-1)
    }
  })
}

function sendVersion (e, status, local = 0) {
  e.sender.send('throwUpdateStatus', status)
  if (status === 'NeedClientUpdate') {}
  else if (status === 'NeedModPackageUpdate') {
    request('https://raw.githack.com/ShapeLayer/aimless.ho9.me/main/aimless-link.json', (err, res, body) => {
      let infoGetted = JSON.parse(body)
      downloadPackage(e, infoGetted[local + 1], local)
    })
  }
  else if (status === 'NoMoreUpdate') {}
}

function downloadPackage (e, packageInfo, local) {
  let reqTarget = packageInfo[0]
  reqProgress(request(reqTarget))
  .on('progress', (state) => {
    win.setProgressBar(state['percent'])
    e.sender.send('throwUpdateStatus', 'NowUpdating', state['percent'])
  })
  .on('error', (err) => {
    //
  })
  .on('end', () => {
    let launcherAccounts
    if (packageInfo[1] == 'zip') {
      if (packageInfo[4]) {
        let bt = new Date()
        let backupTimingStringfy = bt.getFullYear() + '-' + bt.getMonth() + '-' + bt.getDate() + ' ' + bt.getHours() + '_' + bt.getMinutes() + '_' + bt.getSeconds() + ' r_' + getRandomInt(0, 9)
        e.sender.send('throwUpdateStatus', 'NowBackuping')
        if (fs.existsSync(C['mc_path'])) {
          if (fs.existsSync(C['mc_path'] + '\\launcher_accounts.json')) {
            launcherAccounts = fs.readFileSync(C['mc_path'] + '\\launcher_accounts.json')
          }
          mv(C['mc_path'], C['backup_path'] + '\\' + backupTimingStringfy, {mkdirp: true}, (err) => {
            if (launcherAccounts) {
              if (!fs.existsSync(C['mc_path'])) fs.mkdirSync(C['mc_path'])
              fs.writeFileSync(C['mc_path'] + '\\launcher_accounts.json', launcherAccounts)
            }
          })
        }
        if (!fs.existsSync(C['mc_path'])) fs.mkdirSync(C['mc_path'])
      }
      e.sender.send('ApplyingPatch', 'NowBackuping')
      fs.createReadStream(__dirname + '\\' + 'lib/' + (local + 1) + '.' + packageInfo[1])
        .pipe(unzipper.Extract({path: C['mc_path'] + '\\' + packageInfo[3]}))
        .on('entry', (entry) => entry.autodrain())
        .promise()
        .then(() => {
          increaseVersionCount(local)
          e.sender.send('throwUpdateStatus', 'ModPackageUpdateDone')
        })
    }
    else {
      mv(__dirname + '\\' + 'lib/' + (local + 1) + '.' + packageInfo[1], C['mc_path'] + '\\' + packageInfo[3] + '\\' + packageInfo[2], (err) => {})
      increaseVersionCount(local)
      e.sender.send('throwUpdateStatus', 'ModPackageUpdateDone')
    }
  })
  .pipe(fs.createWriteStream(__dirname + '\\' + 'lib/' + (local + 1) + '.' + packageInfo[1]))
}

function increaseVersionCount (local) {
  fs.readFile(__dirname + '\\' + 'version.json', 'utf-8', (err, data) => {
    let localVer = JSON.parse(data)
    localVer['minecraft']['package'] = local + 1
    fs.writeFileSync(__dirname + '\\' + 'version.json', JSON.stringify(localVer))
  })
}

function getAccountOwner (username) {
  let usernames = JSON.parse(fs.readFileSync(__dirname + '\\' + 'assets/usernames.json', 'utf-8'))
  if (Object.keys(usernames).indexOf(username) == -1) return false
  return usernames[username]
}

function checkProfile () {
  if (fs.existsSync(C['mc_path'] + '\\launcher_accounts.json')) {
    let profileNative = fs.readFileSync(C['mc_path'] + '\\launcher_accounts.json', 'utf-8')
    let profile = JSON.parse(profileNative)
    if (Object.keys(profile).length == 1) return ''
    let userName = profile['accounts'][Object.keys(profile['accounts'])[0]]['minecraftProfile']['name']
    let accountOwner = getAccountOwner(userName)
    if (!accountOwner) return userName
    return accountOwner + '(' + userName + ')'
  }
  return ''
}

function loadConfig () {
  let configRaw = fs.readFileSync(__dirname + '\\' + 'config.json', 'utf-8')
  configRaw = configRaw.replaceAll('%appdata%', process.env.appdata.replace(/\\/gi, '\\\\'))
  C = JSON.parse(configRaw)
}

function loadUserConfig (cfg) {
  if (cfg == 'mc_path') {
    return C['mc_path']
  } else if (cfg == 'backup_path') {
    return C['backup_path']
  } else if (cfg == 'mcc_path') {
    return C['mcc_path']
  } else if (cfg == 'java-rams') {
    return 0
  } else if (cfg == 'java-args') {
    return getLaunchJavaArgs()
  }
  return false
}

function getLaunchJavaArgs () {
  if (!fs.existsSync(C['mc_path'] + '\\launcher_profiles.json', 'utf-8')) return false
  let argsRaw = fs.readFileSync(C['mc_path'] + '\\launcher_profiles.json', 'utf-8')
  let args = JSON.parse(argsRaw)
  if (!args['profiles']['forge']) return false
  if (!args['profiles']['forge']['javaArgs']) args['profiles']['forge']['javaArgs'] = '-Xmx5G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M'
  return args['profiles']['forge']['javaArgs']
}

function saveLaunchJavaArgs (value) {
  if (!fs.existsSync(C['mc_path'] + '\\launcher_profiles.json', 'utf-8')) return false
  let argsRaw = fs.readFileSync(C['mc_path'] + '\\launcher_profiles.json', 'utf-8')
  let args = JSON.parse(argsRaw)
  args['profiles']['forge']['javaArgs'] = value
  fs.writeFileSync(C['mc_path'] + '\\launcher_profiles.json', JSON.stringify(args))
}

function saveUserConfig (cfg) {
  for (let i = 0; i < cfg.length; i++) {
    if (cfg[i][0] == 'mc_path' || cfg[i][0] == 'backup_path' || cfg[i][0] == 'mcc_path') {
      C[cfg[i][0]] = cfg[i][1]
    } else if (cfg[i][0] == 'java-args') {
      saveLaunchJavaArgs(cfg[i][1])
    }
  }
  fs.writeFileSync(__dirname + '\\' + 'config.json', JSON.stringify(C))
  loadConfig()
  loadUserConfig()
  return true
}

function initThisProgram () {
  loadConfig()
  if (!fs.existsSync(__dirname + '\\' + 'lib')) {
    fs.mkdirSync(__dirname + '\\' + 'lib')
  }
  if (!fs.existsSync(C['backup_path'])) {
    fs.mkdirSync(C['backup_path'])
  }
  if (!fs.existsSync(C['mc_path'])) {
    fs.mkdirSync(C['mc_path'])
  }
}

function startLauncher () {
  checkProcessInterval = setInterval(() => {
    isRunning('MinecraftLauncher.exe', (status) => {
      if (status) app.quit()
    })
  }, 500)
  exec('"' + C['mcc_path'] + '"', (err, stdout, stderr) => {
  })
}

function findLauncher () {
  if (fs.existsSync(C['mcc_path'])) return true
  else if (fs.existsSync('C:\\Program Files (x86)\\Minecraft Launcher\\MinecraftLauncher.exe')) {
    saveUserConfig([['mcc_path', 'C:\\Program Files (x86)\\Minecraft Launcher\\MinecraftLauncher.exe']])
    return true
  }  else if (fs.existsSync('C:\\Program Files\\Minecraft Launcher\\MinecraftLauncher.exe')) {
    saveUserConfig([['mcc_path', 'C:\\Program Files\\Minecraft Launcher\\MinecraftLauncher.exe']])
    return true
  }
  return false
}

function isRunning (task, cb) {
  exec('tasklist /FI "IMAGENAME eq ' + task + '"', (err, stdout, stderr) => {
    cb(stdout.indexOf(task) > -1)
  })
}

ipcMain.on('getUserName', (e) => {
  e.sender.send('throwUserName', checkProfile())
})

ipcMain.on('getUpdateStatus', (e) => {
  getVersion(e)
})


ipcMain.on('startLauncher', (e) => {
  startLauncher()
})

ipcMain.on('getUserConfig', (e, cfg) => {
  e.sender.send('throwUserConfig', cfg, loadUserConfig(cfg))
})

ipcMain.on('getLauncherIsExists', (e) => {
  e.sender.send('throwLauncherIsExists', findLauncher())
})

ipcMain.on('saveUserConfig', (e, config) => {
  e.sender.send('throwSaveUserConfigDone', saveUserConfig(config))
})

ipcMain.on('closeApp', (e) => {
  app.quit()
})

initThisProgram()