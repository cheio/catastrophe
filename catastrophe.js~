var ownpass;
var muc;
var mucname;
var mucserver;


var avatar_of_hash=[];
var avatar_of_nick=[];
var hash_of_nick=[];

boshurl='https://conversejs.org/http-bind/';
//boshurl='https://daumentempler.de.hm:5281/http-bind/';
//boshurl='https://openim.de/http-bind/';

XMPP = 
{
	connectionStatus: 0,
	conn: null,
	ownJID: null,
	roster: {},
	mucs:{},
	OnCustomConnected:null,
	RoomClient: function(jid, nickname, NewMessageNotifyFunction)
	{
		this.messages=[];
		messages=this.messages;
		this.nickname=nickname;
		var presences = [];

		this.presences = function() { return presences.slice(); }
		//this.nickname = function() { return nickname; }

		this.OnMessage = function(stanza, room)
		{
			sentByNick=stanza.attributes.from.value.match(/[^\/]*$/)[0];
			newMessage=({
				from:stanza.attributes.from.value,
				fromNick:sentByNick,
				type:stanza.attributes.type.value,
				to:stanza.to,
				body:stanza.children[0].innerHTML,
				ownership:sentByNick==(nickname)?'message-mine':'message-other',
				timestamp:moment()
			});
			NewMessageNotifyFunction(newMessage.from, newMessage.body);
			this.messages.push(newMessage);
			
			// $scope.updateLastText(newMessage.from.nodeValue.match(/^[^\/]*/)[0],newMessage,$scope);
			return true;
		};

		this.OnPresence = function(stanza, room)
		{
			presences.push(stanza);
			return true;
		};

		this.SendMessage = function(body)
		{
		   XMPP.conn.muc.groupchat('jid', body);
		};
		XMPP.conn.muc.join ( jid, nickname, this.OnMessage, this.OnPresence);
	},

	JoinMuc: function(jid,nickname,NewMessageNotifyFunction)
	{
		XMPP.mucs[jid]= new XMPP.RoomClient ( jid, nickname, NewMessageNotifyFunction);
		return XMPP.mucs[jid];
	},

	Init: function()
	{
		XMPP.conn=new Strophe.Connection(boshurl);
	},


	NowTimemark: function()
	{
		d= new Date();
		return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()+"T"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"Z";
	},

	Login: function(jid,pass)
	{
		XMPP.ownJID=jid;
		XMPP.conn.connect(jid,pass, this.OnConnectionStatus);
	},


	OnConnectionStatus: function(nStatus)
	{
		console.log(nStatus);
		switch(nStatus)
		{
			case Strophe.Status.CONNECTING: console.log("Connecting"); break;
			case Strophe.Status.DISCONNECTING: OnDisconnectedUser(); console.log("kbye"); break;
			case Strophe.Status.CONNECTED: console.log("Connected"); XMPP.OnConnected(); break;
			case Strophe.Status.CONNFAIL: console.log("No Connection"); break;

			case Strophe.Status.REGISTER:
				console.log("submitting");
				XMPP.conn.register.fields.username=XMPP.ownJID;
				XMPP.conn.register.fields.password=ownpass;
				XMPP.conn.register.submit()
				break;
			case Strophe.Status.REGISTERED:
				console.log("submitting");
				alert("Hat geklappt,log dich ein!");
				XMPP.conn.disconnect();
				alert("Hat geklappt,log dich ein!");
				break;
			case Strophe.Status.AUTHFAIL: alert("Benutzername/Paßwort falsch"); break;
			case Strophe.Status.CONFLICT: alert("User gibt's schon"); break;
			case Strophe.Status.REGIFAIL: alert("Das war nix"); break;

			case 4:loginError(); console.log("nach"); break;
		}
		XMPP.connectionStatus=nStatus;
		return true;
	},

	OnIqStanza: function(stanza) { console.log(stanza); },
	OnMessageStanza: function(stanza)
	{
		if (stanza.attributes.type.value=="chat")
		{
			for (i=0; i<stanza.childNodes.length; i++)
			{
				if(stanza.childNodes[i].localName=="body")
				{
					from=stanza.attributes["from"].value.match(/^[^\/]*/)[0];
					fBody=stanza.childNodes[i].innerHTML;
					newMessageObject={
						from:from,
						type:stanza.attributes.type.value,
						to:stanza.to,
						body:fBody,
						ownership:'message-other',
						timestamp:new Date().getTime(),
			
					}
					XMPP.roster[from].messages.push(newMessageObject);
					if (XMPP.roster[from].OnMessage != null)
					{
						XMPP.roster[from].OnMessage(fBody);
					}
					else
					{
						console.warn("XMPP.roster["+from+"].OnMessage is null")
					}
					console.log(XMPP.OnMessage);
					if (XMPP.OnMessage!=null)
					{
						XMPP.OnMessage(from,fBody);
					}
					else
					{
						console.warn("XMPP.OnMessage is null")
					}
				}
			}
		}
		return true;
	},

	OnConnected: function()
	{
		// XMPP.conn.addHandler(OnPresenceStanza, null, "presence");
		XMPP.conn.addHandler(XMPP.OnMessageStanza, null, "message",null,null,null);
		// XMPP.conn.addHandler(XMPP.OnIqStanza, null, "iq");
		XMPP.conn.send($pres().tree());
		if (XMPP.OnCustomConnected!=null)
		{
			XMPP.OnCustomConnected();
		}
		return true;
	},

	OnMessage: null,

	RefreshRoster: function(OnRosterUpdated)
	{
		XMPP.conn.roster.get(function()
		{
			XMPP.roster={};
			for (contact in XMPP.conn.roster.items)
			{
				var daContact=XMPP.conn.roster.items[contact];
				daContact.OnMessage=null;
				daContact.messages=[];
				daContact.screenName=daContact.jid.match(/^[^@]*/)[0];
				daContact.temporary=false;
				XMPP.roster[daContact.jid]=daContact;
			}
			OnRosterUpdated(XMPP.roster);

		});
	},


	GetUniqueID: function()
	{
		XMPP.conn.getUniqueId("my:code");
	},

	SendPrivateMessage: function(toJID,body)
	{

		var imc = $body({"id":XMPP.GetUniqueID(), "toJID":toJID, 'type':'chat'}).c("body").t(body);
		XMPP.conn.send( imc.tree());
		if(!toJID in roster)
		{
			roster[to]= { jid:toJID, temporary:true, screenName:toJID.match(/^[^@]*/)[0], messages:[] };
		}
		newMessageObject={
			from:from,
			type:'chat',
			to:toJID,
			body:body,
			ownership:'message-own',
			timestamp:new Date().getTime(),
		}
		roster[toJID].messages.push(newMessageObject);

	},


	ChangeMucNick: function(nick)
	{
		var st=$pres({"id":GetUniqueID(), "to":mucserver+nick});
		XMPP.conn.send(st.tree());
	},


	RequestVcard: function(from)
	{
		from=from.replace(/\/.*$/,'');		// remove ressource
		var req=$iq({"from":from,"type":"get","id":"vc2"}).c("vCard", {"xmlns":"vcard-temp"});
		XMPP.conn.send(req.tree());
		console.log("requesting "+from);
	},

	ChangeVcardNick: function(to)
	{
		var req=$iq({"id":GetUniqueID(), "type":"set"}).c("vCard", {"xmlns":"vcard-temp"});
		req.c("NICKNAME").t(to);
		XMPP.conn.send(req.tree());
		return true;
	},



	RegisterUser: function(user,pass)
	{
		XMPP.ownJID=user;
		ownpass=pass;
		//var reg=$iq({"type":"set","id":GetUniqueID()}).c("query", {"xmlns":"jabber:iq:register"});
		/*reg.c("username").t(user);
		reg.c("password").t(pass);*/
		//console.log(reg.h());
		XMPP.conn.register.connect("daumentempler.de.hm",OnConnectionStatus,60,1);
	},



	OnRegister: function(nStatus)
	{
		console.log("Reg..");
		switch(nStatus)
		{
			default: OnConnectionStatus(nStatus);
		}
		return true;
	},
}
