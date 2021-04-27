function setOverlay (overlayType, action) {
    if (overlayType == 'notice') {
        if (action == 'open') {
            document.getElementById('o-notice').style.display = 'block'
            document.getElementById('overlay').style.display = 'flex'
        } else if (action == 'close') {
            document.getElementById('o-notice').style.display = 'none'
            document.getElementById('overlay').style.display = 'none'
        }
    } else if (overlayType == 'config') {
        if (action == 'open') {
            document.getElementById('o-config').style.display = 'block'
            document.getElementById('overlay').style.display = 'flex'
        } else if (action == 'close') {
            document.getElementById('o-config').style.display = 'none'
            document.getElementById('overlay').style.display = 'none'
        }
    }
}