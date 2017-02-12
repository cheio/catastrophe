//boshurl='https://conversejs.org/http-bind/';
//boshurl='https://daumentempler.de.hm:5281/http-bind/';
//boshurl='https://openim.de/http-bind/';

XMPP = 
{
	connectionStatus: 0,
	conn: null,
	ownJID: null,
	ownVCard: {},
	roster: {},
	mucs:{},
	OnCustomConnected:null,
	RoomClient: function(roomJid, nickname, NewMessageNotifyFunction)
	{
		this.messages=[];
		this.occupants=[];
		messages=this.messages;
		this.NewMessageNotifyFunction = NewMessageNotifyFunction;
		this.nickname=nickname;
		var presences = [];

		this.presences = function() { return presences.slice(); }
		//this.nickname = function() { return nickname; }

		this.OnMessage = function(stanza, room)
		{
			if (stanza.getElementsByTagName("body").length != 0)
			{
				if(stanza.getElementsByTagName("delay").length != 0) time = new Date(stanza.getElementsByTagName("delay")[0].attributes.stamp.value);
				else time = new Date();
				sentByNick=stanza.attributes.from.value.match(/[^\/]*$/)[0];
				newMessage={
					from:stanza.attributes.from.value,
					fromNick:sentByNick,
					type:stanza.attributes.type.value,
					to:stanza.to,
					body:stanza.children[0].innerHTML,
					ownership:sentByNick==(XMPP.mucs[roomJid].nickname)?'message-own':'message-other',
					timestamp:time.getTime(),
				}
				XMPP.mucs[roomJid].messages.push(newMessage);
				XMPP.mucs[roomJid].NewMessageNotifyFunction(newMessage.from, newMessage.body);
			}
			return true;
		};

		this.OnPresence = function(stanza, room)
		{
			presences.push(stanza);
			return true;
		};

		this.SendMessage = function(body)
		{
			XMPP.conn.muc.groupchat(roomJid, body);
		};

		this.refreshOccupants = function(callback)
		{
			XMPP.conn.muc.queryOccupants(roomJid,function(stanza){
				var occupantsArray = [];
				var itemArray = stanza.getElementsByTagName("item");
				for(i=0;i<itemArray.length;i++) occupantsArray.push("" + itemArray[i].getAttribute("name"));
				XMPP.mucs[roomJid].occupants = occupantsArray;
				callback(this.occupants);
			});
		};

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
		XMPP.mucs[jid].refreshOccupants();
		return XMPP.mucs[jid];
	},

	OnMucInvitation: null,

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

			case Strophe.Status.AUTHFAIL: if (XMPP.OnError!=null) XMPP.OnError("authentication"); break;

		}
		XMPP.connectionStatus=nStatus;
		return true;
	},

	OnIqStanza: function(stanza) { console.log(stanza); },
	OnMessageStanza: function(stanza)
	{	//console.log(stanza);
		if (stanza.attributes.type.value=="chat")
		{
			for (i=0; i<stanza.childNodes.length; i++)
			{
				from=stanza.attributes["from"].value.match(/^[^\/]*/)[0];
				if(stanza.childNodes[i].localName=="body")
				{
					fBody=stanza.childNodes[i].innerHTML;
					newMessageObject={
						from:from,
						type:stanza.attributes.type.value,
						to:stanza.to,
						body:fBody,
						ownership:'message-other',
						timestamp:new Date().getTime(),
			
					}
					if(XMPP.OnStopWriting !=null)
					{
						XMPP.OnStopWriting(from);
					}
					if(!(from in XMPP.roster))
					{
						XMPP.roster[from] = {messages: []};
					}			
					XMPP.roster[from].messages.push(newMessageObject);
					if (XMPP.roster[from].OnMessage != null)
					{
						XMPP.roster[from].OnMessage(fBody);
					}
					else
					{
						console.warn("XMPP.roster["+from+"].OnMessage is null");
					}
					console.log(XMPP.OnMessage);
					if (XMPP.OnMessage!=null)
					{
						XMPP.OnMessage(from,fBody);
					}
					else
					{
						console.warn("XMPP.OnMessage is null");
					}
				}
				else if(stanza.childNodes[i].localName=="composing" && XMPP.OnWriting != null)
				{
					XMPP.OnWriting(from);
				}
				else if(stanza.childNodes[i].localName=="pause" && XMPP.OnStopWriting != null)
				{
					XMPP.OnStopWriting(from);
				}
			}
		}
		else if(stanza.attributes.type.value=="normal")
		{	
			var inviteElems = stanza.getElementsByTagName("invite");
			if(inviteElems.length > 0){	
				var inviteElem = inviteElems[0];
				var muc = stanza.attributes["from"].value.match(/^[^\/]*/)[0];
				var from = inviteElem.attributes["from"].value.match(/^[^\/]*/)[0];
				var reasonElem = stanza.getElementsByTagName("reason");
				if(reasonElem.length > 0)
					var reason = reasonElem[0].innerHTML;
				if (XMPP.OnMucInvitation!=null)
					XMPP.OnMucInvitation(from,muc,reason);
				console.log("MUC-invitation from " + from + " in MUC: " + muc);
			}
		}
		return true;
	},

	OnConnected: function()
	{
		// XMPP.conn.addHandler(OnPresenceStanza, null, "presence");
		//XMPP.conn.addHandler(XMPP.OnMessageStanza, null, "message",null,null,null);
		// XMPP.conn.addHandler(XMPP.OnIqStanza, null, "iq");
		XMPP.conn.addHandler(XMPP.OnSubscriptionRequest, null, "presence", "subscribe");
		XMPP.conn.addHandler(XMPP.OnMessageStanza,null, "message"); 
		XMPP.conn.send($pres().tree());
		XMPP.RequestUploadService();
		XMPP.RequestVcard(XMPP.ownJID,function(vcard){XMPP.ownVCard = vcard
			if (XMPP.OnCustomConnected!=null)
			{
				XMPP.OnCustomConnected();
			}
			});
		return true;
	},

	OnMessage: null,
	OnWriting: null,
	OnStopWriting: null,
	OnDisconnect: null,
	OnError:null,
	OnWarning:null,

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
				XMPP.RequestVcard(daContact.jid,function(vcard,jid){
					XMPP.roster[jid].vcard = vcard;
					});
			}
			OnRosterUpdated(XMPP.roster);
		});
	},

	AddToRoster: function(jid,message)
	{
		XMPP.conn.roster.subscribe(jid,message);
		XMPP.conn.roster.authorize(jid,"");
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
		if(!(to in XMPP.roster))
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


	SendChatState: function(to,chatState)
	{
		var imc = $msg({"id":XMPP.GetUniqueID(), xmlns: "jabber:client", from:XMPP.ownJID, "to":to, 'type':'chat'}).c(chatState, {xmlns: "http://jabber.org/protocol/chatstates"});
		XMPP.conn.send( imc.tree());
	},


	ChangeMucNick: function(nick)
	{
		// not implemented yet
		// var st=$pres({"id":GetUniqueID(), "to":mucserver+nick});
		// XMPP.conn.send(st.tree());
	},


	RequestVcard: function(from,callback)
	{
		console.warn("RequestVcard is deprecated. Use RequestVCard instead");
		XMPP.ReqestVCard(vCardObject,callback);
	},
	RequestVCard: function(from,callback)
	{
		from=from.replace(/\/.*$/,'');		// remove ressource
		XMPP.conn.vcard.get(
					function success(iq)
					{
						var vcard = iq.getElementsByTagName("vCard")[0];
						callback(getXMLToArray(vcard),from);
					},from,
					function failure(iq)
					{
						callback(false);
					}
					,30000/*timeout sendIQ*/
				);
	},

	SetVcard: function(vCardObject,callback)
	{
		console.warn("SetVcard is deprecated. Use SetVCard instead.");
		XMPP.SetVCard(vCardObject,callback);
	},
	SetVCard: function(vCardObject,callback)
	{
		vCardXML = "<vCard>";
		if("N" in vCardObject)
		{
		    vCardXML = vCardXML + "<N>";
		    if("GIVEN" in vCardObject.N) vCardXML = vCardXML + "<GIVEN>" + vCardObject.N.GIVEN + "</GIVEN>";
		    if("FAMILY" in vCardObject.N) vCardXML = vCardXML + "<FAMILY>" + vCardObject.N.FAMILY + "</FAMILY>";
		    vCardXML = vCardXML + "</N>";
		}
		if("X-GENDER" in vCardObject) vCardXML = vCardXML + "<X-GENDER>" + vCardObject["X-GENDER"] + "</X-GENDER>";
		if("BDAY" in vCardObject) vCardXML = vCardXML + "<BDAY>" + vCardObject.BDAY +  "</BDAY>";
		if(typeof vCardObject.MARITAL === 'object' && "STATUS" in vCardObject.MARITAL) vCardXML = vCardXML + "<MARITAL><STATUS>" + vCardObject.MARITAL.STATUS + "</STATUS></MARITAL>";
		if("ADR" in vCardObject)
		{
		    vCardXML = vCardXML + "<ADR>";
		    if("CTRY" in vCardObject.ADR) vCardXML = vCardXML + "<CTRY>" + vCardObject.ADR.CTRY + "</CTRY>";
		    if("LOCALITY" in vCardObject.ADR) vCardXML = vCardXML + "<LOCALITY>" + vCardObject.ADR.LOCALITY + "</LOCALITY>";
		    vCardXML = vCardXML + "</ADR>";
		}
		if("ROLE" in vCardObject) vCardXML = vCardXML + "<ROLE>" + vCardObject.ROLE + "</ROLE>";
		if("DESC" in vCardObject) vCardXML = vCardXML + "<DESC>" + vCardObject.DESC + "</DESC>";
		if("PHOTO" in vCardObject)
		{
		    vCardXML = vCardXML + "<PHOTO>";
		    if("BINVAL" in vCardObject.PHOTO) vCardXML = vCardXML + "<BINVAL>" + vCardObject.PHOTO.BINVAL + "</BINVAL>";
		    if("TYPE" in vCardObject.PHOTO) vCardXML = vCardXML + "<TYPE>" + vCardObject.PHOTO.TYPE + "</TYPE>";
		    vCardXML = vCardXML + "</PHOTO>";
		}
		vCardXML = vCardXML + "</vCard>";

		vCardDoc = $.parseXML(vCardXML);
		//vCardDoc = $parseXML(vCardXML);		// not tested yet

		vCardElement = vCardDoc.documentElement;

		XMPP.conn.vcard.set(function success(iq){ XMPP.ownVCard = vCardObject; callback(iq); return true; },vCardElement,XMPP.ownJID,function success(iq){ callback(iq); return false; });
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

	OnSubRequest: null,

	OnSubRequestAccepted: null,

	OnSubscriptionRequest: function(stanza)
	{	
		var from = stanza.getAttribute("from");
		console.log("Subscription-request from " + from);
		if(from in XMPP.roster)
		{
		    // Send a 'subscribed' notification back to accept the incoming
		    // subscription request
		    XMPP.conn.send($pres({ to: from, type: "subscribed" }));
			XMPP.AuthorizeRequest(from);
		    if (XMPP.OnSubRequestAccepted!=null) XMPP.OnSubRequestAccepted(from);
		}
        else
        {
		    if (XMPP.OnSubRequest!=null) XMPP.OnSubRequest(from);
        }

		return true;
	},

	logout: function()
	{
		console.warn("XMPP.logout is deprecated. Use XMPP.Logout instead");
		XMPP.Logout();
	}

	Logout: function()
	{
		XMPP.conn.options.sync = true; // Switch to using synchronous requests since this is typically called onUnload.
		XMPP.conn.flush();
		XMPP.conn.disconnect();
		XMPP.conn = null;
		XMPP.ownJID = null;
		XMPP.roster = {};
		XMPP.mucs = {};
	},

}



function $parsexml (xml)
{
	if (window.DOMParser)
	{
		var parser = new DOMParser ();
		return parser.parseFromString (xml, "text/xml");
	}
	else
	{
		console.warn("Internet Explorer not supported.");
		return false;
	}
}


function getXMLToArray(xmlDoc)
{
	var thisArray = new Array();
	//Check XML doc
	if($(xmlDoc).children().length > 0)
	{
		//Foreach Node found
		$(xmlDoc).children().each(function()
		{
			if($(xmlDoc).find(this.nodeName).children().length > 0)
			{
				//If it has children recursively get the inner array
				var NextNode = $(xmlDoc).find(this.nodeName);
				thisArray[this.nodeName] = getXMLToArray(NextNode);
			}
			else
			{
				//If not then store the next value to the current array
				thisArray[this.nodeName] = $(xmlDoc).find(this.nodeName).text();
			}
		});
	}
	return thisArray;
}
