// BluOS Viewer
// Extracts track data from BluOS music streaming devices
// This software is provided as is and no claims to its usefulness of any kind are given
//

var playerIPCookie = "bluOSPlayerIPAddress";
var bluOSPortNr = "11000";
var baseUrl = "";
var reloadTime = 1000;
var currentTrackIndex = -1;
var pauseSymbol = "&#10073;&#10073;";
var playSymbol = "&#9658;";

// Javascript main entry point
//
function startup() {
	checkForPlayerIPAddress(false);
	loadTrackData();
	loadPlaylistData();
}

// Cookie functions
//
function setPlayerIP(ipAddress) {
	var d = new Date();
	d.setTime(d.getTime() + (31556926 * 1000));		// Year in seconds, also accounting for leap years
	var expires = "expires=" + d.toGMTString();
	document.cookie = playerIPCookie + "=" + ipAddress + ";" + expires + ";path=/"; 
}

function getPlayerIP() {
	var name = playerIPCookie + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function checkForPlayerIPAddress(forceAsk) {
	var ipAddress = getPlayerIP();
	var inputPlaceholder = "No checking is performed here so make sure the value is correct.";
	if (ipAddress != "") {
		inputPlaceholder = ipAddress;
	}
	if (ipAddress == "" || forceAsk == true) {
		ipAddress = prompt("Please enter your player's IP address:", inputPlaceholder);
		if (ipAddress != "" && ipAddress != null) {
			setPlayerIP(ipAddress);
		}
	}
	baseUrl = "http://" + ipAddress + ":" + bluOSPortNr;
}

// Functions for reading current track data
//
function loadTrackData() {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			parseTrackData(this);
		}
	};
	xmlhttp.open("GET", baseUrl + "/Status", true);
	xmlhttp.send();
}

function parseTrackData(xml) {
	setTimeout(function() {
		loadTrackData();
	}, reloadTime);

	var xmlDoc = xml.responseXML;
	var trackData = "";

	var currentTrack = xmlDoc.getElementsByTagName("song")[0];
	if (currentTrack != undefined) {
		currentTrackIndex = currentTrack.innerHTML;
	}
	var artistName = xmlDoc.getElementsByTagName("title2")[0];
	if (artistName != undefined) {
		trackData += "<div class=\"boldMenloText\">" + artistName.innerHTML + "</div>";
	}
	var trackName = xmlDoc.getElementsByTagName("title1")[0];
	if (trackName != undefined) {
		trackData += "<div class=\"menloText\">" + trackName.innerHTML + "</div>";
	}
	var albumName = xmlDoc.getElementsByTagName("title3")[0];
	if (albumName != undefined) {
		trackData += "<div class=\"italicMenloText\">" + albumName.innerHTML + "</div>";
	}
	
	var albumCover = "";
	if (xmlDoc.getElementsByTagName("stationImage")[0] != undefined) {
		albumCover = xmlDoc.getElementsByTagName("stationImage")[0].innerHTML
	}
	else if (xmlDoc.getElementsByTagName("image")[0] != undefined) {
		albumCover = baseUrl + xmlDoc.getElementsByTagName("image")[0].innerHTML;
	}
	var state = xmlDoc.getElementsByTagName("state")[0].innerHTML;
	if (state != "stop" || (state == "stop" && albumCover != "")) {
		if (state == "play" || state == "connecting" || state == "stream") {
			document.getElementById("playingIcon").innerHTML = playSymbol;
		}
		else if (state == "pause") {
			document.getElementById("playingIcon").innerHTML = pauseSymbol;
		}
		var streamRawData = xmlDoc.getElementsByTagName("streamFormat")[0];
		if (streamRawData != undefined) {
			var streamFormat = parseStreamFormat(streamRawData.innerHTML);
			trackData += "<div class='smallMenloText'>" + streamFormat.frequency + " kHz, "
					  +  streamFormat.bitrate + " bit " + streamFormat.fileType + "</div>";
		}
		var trackTime = "";
		var totalLength = xmlDoc.getElementsByTagName("totlen")[0];
		if (totalLength != undefined) {
			var playedLength = xmlDoc.getElementsByTagName("secs")[0];
			if (playedLength != undefined) {
				var prettyPlayedLength = new Date(playedLength.innerHTML * 1000).toISOString().substr(14, 5);
				trackTime += "<div class='ledText'>" + prettyPlayedLength + "</div>";
				var prettyTotalLength = new Date(totalLength.innerHTML * 1000).toISOString().substr(14, 5);
				trackTime += "<div class='smallLedText'>&#9659; " + prettyTotalLength + " &#9669;</div>";
				document.getElementById("trackTime").innerHTML = trackTime;
			}
		}
		var quality = xmlDoc.getElementsByTagName("quality")[0];
		if (quality != undefined) {
			if (quality.innerHTML == "hd") {
				document.getElementById("qualityIcon").style.background = "url('./hires.jpg')";
			}
			else if (quality.innerHTML == "cd") {
				document.getElementById("qualityIcon").style.background = "url('./cd.png')";
			}
			else if (quality.innerHTML.length > 3) {
				document.getElementById("qualityIcon").style.background = "url('./mp3.png')";
			}
		}
		else {
			document.getElementById("qualityIcon").style.background = "";
		}
		document.getElementById("qualityIcon").style.backgroundSize = "50px 50px";
		document.getElementById("artwork").style.background = "url('" + albumCover + "')";
		document.getElementById("background").style.background = "url('" + albumCover +"')";

		var serviceIcon = xmlDoc.getElementsByTagName("serviceIcon")[0].innerHTML;
		document.getElementById("serviceIcon").style.background = "url('" + baseUrl + serviceIcon + "')";
		document.getElementById("serviceIcon").style.backgroundSize = "50px 50px";
	}
	else {
		playlistScrollPosition = -1;
		document.getElementById("trackInfo").innerHTML = "<div class=\"text\"></div>";
		document.getElementById("trackTime").innerHTML = "";
		document.getElementById("playingIcon").innerHTML = "";
		document.getElementById("serviceIcon").style.background = "";
		document.getElementById("qualityIcon").style.background = "";
		document.getElementById("playingIcon").style.background = "";
		document.getElementById("artwork").style.background = "url('./bluesound.jpg')";
		document.getElementById("background").style.background = "url('./bluesound.jpg')";
	}
	document.getElementById("artwork").style.backgroundSize = "contain";
	document.getElementById("background").style.backgroundSize = "cover";
	document.getElementById("background").style.backgroundPosition = "center";
	document.getElementById("background").style.backgroundRepeat = "no-repeat";
	document.getElementById("trackInfo").innerHTML = trackData;
}

function parseStreamFormat(format) {
	var parsedFormat = {
    	fileType: "",
        frequency: "",
        bitrate: "",
        channels: ""
    };
    if (format != undefined) {
		var streamData = format.split(' ');
		if (streamData.length == 2) {
			parsedFormat.fileType = streamData[0];
			var streamSampleDepth = streamData[1].split('/');
			if (streamSampleDepth.length == 3) {
				parsedFormat.frequency = streamSampleDepth[0] / 1000.0;
				parsedFormat.bitrate = streamSampleDepth[1];
				parsedFormat.channels = streamSampleDepth[2];
    		}
		}
	}
	return parsedFormat;
}

// Functions for reading the playlist
//
function loadPlaylistData() {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			parsePlaylistData(this);
		}
	};
	xmlhttp.open("GET", baseUrl + "/Playlist", true);
	xmlhttp.send();
}

function parsePlaylistData(xml) {
	setTimeout(function () {
		loadPlaylistData();
	}, reloadTime);
	var xmlDoc = xml.responseXML;
	var playlistData = "";
	var playlistXml = xmlDoc.getElementsByTagName("playlist")[0];
	var playlistLength = playlistXml.getAttribute("length");
	for (var i = 0; i < playlistLength; i++) {
		var songData = playlistXml.getElementsByTagName("song")[i];
		var artistName = songData.getElementsByTagName("art")[0];
		var trackName = songData.getElementsByTagName("title")[0];
		var albumName = songData.getElementsByTagName("alb")[0];
		if (artistName != undefined) {
			var entryClass = (i == currentTrackIndex ? "currentPlaylistEntry" : 'playlistEntry');
			playlistData += "<div onClick='playTrack(" + i + ")'>"
						 +  "<div class='" + entryClass + "' id='playlistTrack" + i + "'><div class='menloText'>" + trackName.innerHTML
						 +  "</div><div class='smallMenloText'>" + artistName.innerHTML
						 +  "</div><div class='smallItalicMenloText'>" + albumName.innerHTML + "</div></div>"
						 +  "</div>";
		}
	}
	document.getElementById("playlist").innerHTML = playlistData;
}

// Simple streamer playing controls
//
function doRestCall(url) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET", baseUrl + url, true);
	xmlhttp.send();
}

function playTrack(index) {
	doRestCall("/Play?id=" + index);
}

function play() {
	doRestCall("/Play");
}

function pause() {
	doRestCall("/Pause");
}

function skipBack() {
	doRestCall("/Back");
}

function skipForward() {
	doRestCall("/Skip");
}

function clearPlaylist() {
	if (confirm("This will clear the playlist. Are you sure you want to continue?") == false) {
		return;
	}
	doRestCall("/Clear");
}

function enterPlayerIPAddress() {
}
