var ownjid;
var ownpass;
var muc;
var mucname;
var mucserver;
var conn;


var avatar_of_hash=[];
var avatar_of_nick=[];
var hash_of_nick=[];
boshurl='https://tfor.de:5281/http-bind/';
conn=new Strophe.Connection(boshurl);

function nowTimemark()
{
	d= new Date();
	return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()+"T"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"Z";
}

function login(jid,pass)
{
	ownjid=jid;
	conn.connect(jid,pass, OnConnectionStatus);

}

function OnConnectionStatus(nStatus)
{
	console.log(nStatus);
	switch(nStatus)
	{
		case Strophe.Status.CONNECTING: console.log("Connecting"); break;
		case Strophe.Status.DISCONNECTING: OnDisconnectedUser(); console.log("kbye"); break;
		case Strophe.Status.CONNECTED: OnConnected(); break;

		case Strophe.Status.REGISTER:
			console.log("submitting");
			conn.register.fields.username=ownjid;
			conn.register.fields.password=ownpass;
			conn.register.submit()
			break;
		case Strophe.Status.REGISTERED:
			console.log("submitting");
			alert("Hat geklappt,log dich ein!");
			conn.disconnect();
			alert("Hat geklappt,log dich ein!");
			break;
		case Strophe.Status.NOTACCEPTABLE: alert("Blöde Daten."); break;
		case Strophe.Status.CONFLICT: alert("User gibt's schon"); break;
		case Strophe.Status.REGIFAIL: alert("Das war nix"); break;

		case 4:loginError(); console.log("nach"); break;
	}
	/*
	if (nStatus == Strophe.Status.CONNECTING) { console.log("Connecting"); }
	else if (nStatus == Strophe.Status.CONNFAIL) {  console.log("Fails :("); }
	else if (nStatus == Strophe.Status.DISCONNECTING) {   console.log("Goin offz... "); }
	else if (nStatus == Strophe.Status.DISCONNECTED) {   console.log("Off"); }
	else if (nStatus == Strophe.Status.CONNECTED) { OnConnected(); }
	else if (nStatus == 4) { loginError(); }
	*/
	return true;
}

function OnConnected()
{
	conn.addHandler(OnPresenceStanza, null, "presence");
	conn.addHandler(OnMessageStanza, null, "message");
	conn.addHandler(OnIqStanza, null, "iq");
	conn.send($pres());
	OnConnectedUser();
	return true;
}




function getUniqueID()
{
	conn.getUniqueId("my:code");
}

function sendPrivateMessage(to,msg)
{
	var imc = $msg({"id":getUniqueID(), "to":to, 'type':'chat'}).c("body").t(msg);
	//log({"direction":"outgoing"},imc.toString());
	conn.send( imc.tree());
}

function sendMucMessage(to,msg)
{
	var imc = $msg({"id":getUniqueID(), "to":to, 'type':'groupchat'}).c("body").t(msg);
	//log({"direction":"outgoing"},imc.toString());
	conn.send( imc.tree());
}

function joinMuc(name,server,nickname)
{
	mucserver=name+"@"+server+"/";
	var st= $pres({"id":getUniqueID(), "to":name+"@"+server+"/"+nickname}).c("x", {"xmlns":"http://jabber.org/protocol/muc/"});
	mucname=nickname;
	//log({"direction":"outgoing"},st.toString());
	conn.send(st.tree());
}


function changeMucNick(nick)
{
	var st=$pres({"id":getUniqueID(), "to":mucserver+nick});
	conn.send(st.tree());
}


function requestVcard(from)
{
	from=from.replace(/\/.*$/,'');		// remove ressource
	var req=$iq({"from":from,"type":"get","id":"vc2"}).c("vCard", {"xmlns":"vcard-temp"});
	conn.send(req.tree());
	console.log("requesting "+from);
}

function changeVcardNick(to)
{
	var req=$iq({"id":getUniqueID(), "type":"set"}).c("vCard", {"xmlns":"vcard-temp"});
	req.c("NICKNAME").t(to);
	conn.send(req.tree());
	return true;
}



function registerUser(user,pass)
{
	ownjid=user;
	ownpass=pass;
	//var reg=$iq({"type":"set","id":getUniqueID()}).c("query", {"xmlns":"jabber:iq:register"});
	/*reg.c("username").t(user);
	reg.c("password").t(pass);*/
	//console.log(reg.h());
	conn.register.connect("daumentempler.de.hm",OnConnectionStatus,60,1);
}



function OnRegister(nStatus)
{
	console.log("Reg..");
	switch(nStatus)
	{
		default: OnConnectionStatus(nStatus);
	}
	return true;
}
