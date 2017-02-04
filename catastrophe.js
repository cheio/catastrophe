//boshurl='https://conversejs.org/http-bind/';
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
	RoomClient: function(roomJid, nickname, NewMessageNotifyFunction)
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

		this.SendMessage = function(body) { XMPP.conn.muc.groupchat(roomJid, body); };

		this.InviteUser = function(userJid,message)
		{
			console.log(roomJid);
			console.log(userJid);
			console.log(message);
			res = XMPP.conn.muc.invite(roomJid,userJid,message);
			console.log(res);
		}
		XMPP.conn.muc.join ( roomJid, nickname, this.OnMessage, this.OnPresence);
	},

	JoinMuc: function(jid,nickname,NewMessageNotifyFunction)
	{
		XMPP.mucs[jid]= new XMPP.RoomClient ( jid, nickname, NewMessageNotifyFunction);
		return XMPP.mucs[jid];
	},

	Init: function(boshurl)
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
			case Strophe.Status.DISCONNECTING: if (XMPP.OnDisconnect != null) XMPP.OnDisconnect(); break;
			case Strophe.Status.CONNECTED: console.log("Connected"); XMPP.OnConnected(); break;
			case Strophe.Status.CONNFAIL: console.log("No Connection"); break;

			case Strophe.Status.REGISTER:
				// not implemented yet
				/* console.log("submitting");
				XMPP.conn.register.fields.username=XMPP.ownJID;
				XMPP.conn.register.fields.password=ownpass;
				XMPP.conn.register.submit()*/
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
	OnDisconnect: null,

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

	AddToRoster: function(jid,message)
	{
		XMPP.conn.roster.subscribe(jid,message);
		XMPP.conn.roster.authorize(jid,message,"");
		XMPP.conn.roster.add(jid,message,"",function(what){console.log(what);});
	},
	RemoveFromRoster: function(jid)
	{
		XMPP.conn.roster.unsubscribe(jid, "");
		XMPP.conn.roster.unauthorize(jid, "");
		XMPP.conn.roster.remove(jid);
		XMPP.conn.roster.removeItem(jid);
	},
	AuthorizeRequest: function(jid) {XMPP.conn.roster.authorize(jid,"");},


	GetUniqueID: function()
	{
		XMPP.conn.getUniqueId("my:code");
	},

	SendPrivateMessage: function(to,message)
	{
		var imc = $msg({"id":XMPP.GetUniqueID(), "to":to, 'type':'chat'}).c("body").t(message);
		XMPP.conn.send( imc.tree());
		if(!to in XMPP.roster)
		{
			XMPP.roster[to]= { jid:to, temporary:true, screenName:to.match(/^[^@]*/)[0], messages:[] };
		}
		newMessageObject={
			from:XMPP.ownJID,
			type:'chat',
			to:to,
			body:message,
			ownership:'message-own',
			timestamp:new Date().getTime(),
		}
		XMPP.roster[to].messages.push(newMessageObject);
	},


	ChangeMucNick: function(nick)
	{
		// not implemented yet
		// var st=$pres({"id":GetUniqueID(), "to":mucserver+nick});
		// XMPP.conn.send(st.tree());
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



	RegisterUser: function(user,password,server,callback)
	{
		registerCallback=function(status)
		{
			if ( status==Strophe.Status.REGISTER )
			{
				XMPP.conn.register.fields.username = user;
				XMPP.conn.register.fields.password = password;
				XMPP.conn.register.submit();
			}
			else if ( status==Strophe.Status.REGISTERED )
			{
				callback('ok');
			}
			else if ( status==Strophe.Status.CONFLICT )
			{
				callback('conflict');
			}
			else if ( status==Strophe.Status.NOTACCEPTABLE )
			{
				callback('not acceptable');
			}
			else if ( status==Strophe.Status.REGIFAIL )
			{
				callback('regifail');
			}
			else if ( status==Strophe.Status.CONNECTED )
			{
			}
			else
				callback('?');
		}
		XMPP.conn.register.connect(server,registerCallback,60,1);
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

