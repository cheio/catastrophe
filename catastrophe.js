//boshurl='https://conversejs.org/http-bind/';
//boshurl='https://daumentempler.de.hm:5281/http-bind/';
//boshurl='https://openim.de/http-bind/';

const requestTimeout = 5 * 1000;

XMPP = 
{
	connectionStatus: 0,
	conn: null,
	ownJID: null,
	ownDomain: null,
	ownVCard: {},
	roster: {},
	groups: {},
	httpUploadEnabled: false,
	pubsubServer: false,

//================================================== 
//			EVENTS	
//================================================== 

	OnCustomConnected:null,
	OnStartedTyping: null,
	OnStoppedTyping: null,
	OnDisconnect: null,
	OnError:null,
	OnWarning:null,

//================================================== 
//			MUC
//================================================== 

	mucs:{},
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
			console.log("oakg");
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

	ChangeMucNick: function(nick)
	{
		// not implemented yet
		// var st=$pres({"id":GetUniqueID(), "to":mucserver+nick});
		// XMPP.conn.send(st.tree());
	},


//================================================== 
//			SESSION
//================================================== 

	Init: function(boshurl)
	{
		if (navigator.appName=="Microsoft Internet Explorer")
		{
			console.error("Microsoft Internet Explorer is not supported. Please use a browser.");
			return false;
		}
		XMPP.conn=new Strophe.Connection(boshurl);
		return true;
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
			default: XMPP.OnWarning("???");break;

		}
		XMPP.connectionStatus=nStatus;
		return true;
	},

	OnIqStanza: function(stanza) { console.log(stanza); },

	requestTimeout: null,
	
	loginRequests: 0,
	
	loginRequestReadyCheck: function(){
		XMPP.loginRequests++;
		if (XMPP.loginRequests >= 3 && XMPP.OnCustomConnected!=null) {
			clearTimeout(XMPP.requestTimeout);
			XMPP.OnCustomConnected();
			}
	},

	OnConnected: function()
	{	
		// XMPP.conn.addHandler(OnPresenceStanza, null, "presence");
		//XMPP.conn.addHandler(XMPP.OnMessageStanza, null, "message",null,null,null);
		// XMPP.conn.addHandler(XMPP.OnIqStanza, null, "iq");
		XMPP.conn.addHandler(XMPP.OnSubscriptionRequest, null, "presence", "subscribe");
		XMPP.conn.addHandler(XMPP.OnMessageStanza,null, "message");
		XMPP.conn.send($pres().tree());
		XMPP.conn.messageCarbons.enable(XMPP.OnMessageCarbonReceived);
		XMPP.ownDomain = XMPP.conn.domain;
		if (XMPP.OnCustomConnected!=null) {
			XMPP.requestTimeout = setTimeout(function(){XMPP.loginRequests = -10; XMPP.OnCustomConnected();},requestTimeout);
			}
		XMPP.loginRequests = 0;
		
		XMPP.RequestServices(function()
		{
			XMPP.loginRequestReadyCheck();
			XMPP.GetAllSubscriptions(XMPP.pubsubServer, function(subscriptions)
					{
						XMPP.groups = subscriptions;
						XMPP.loginRequestReadyCheck();
					},function()
					{
						console.warn("No answer from " + XMPP.pubsubServer);
						XMPP.loginRequestReadyCheck();
					});
		});
		XMPP.RequestAvatar(XMPP.ownJID,XMPP.loginRequestReadyCheck);
		return true;
	},


	logout: function()
	{
		console.warn("XMPP.logout is deprecated. Use XMPP.Logout instead");
		XMPP.Logout();
	},

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
//================================================== 
//			ROSTER
//================================================== 
	
	vcardCounter: 0,
	
	countRoster: 0,
	
	RefreshRoster: function(OnRosterUpdated,OnAvatarRecieved)
	{
		XMPP.conn.roster.get(function()
		{
			XMPP.roster={};
			XMPP.countRoster = XMPP.conn.roster.items.length;
			
			for (contact in XMPP.conn.roster.items)
			{
				var currentContact=XMPP.conn.roster.items[contact];
				
				currentContact.OnMessage=null;
				currentContact.messages=[];
				currentContact.screenName=currentContact.jid.match(/^[^@]*/)[0];
				currentContact.temporary=false;
				XMPP.roster[currentContact.jid]=currentContact;
			}
			XMPP.requestCounter = 0;
			XMPP.RecursiveAvatarRequest(OnAvatarRecieved);
			OnRosterUpdated(XMPP.roster);
		});
	},
	
	requestCounter:0,
	
	RecursiveAvatarRequest : function(callback=function(){}){
		var ready = false;
		var RosterArray = $.map(XMPP.roster, function(value, index) {return [value];});
		var next = function(){			
			if(!ready){
				ready = true;
				XMPP.RecursiveAvatarRequest(callback);
			}
		};
		if(XMPP.requestCounter >= RosterArray.length) return true;
		XMPP.requestCounter++;
		XMPP.RequestAvatar(RosterArray[XMPP.requestCounter-1].jid,function(avatar,jid){callback(jid,avatar); next();});
		setTimeout(next, 500);
	},
	
	RequestAvatar: function(requestJID,callback){
		var JID = (' ' + requestJID).slice(1);
		var req=$iq({"type":"get", "from": XMPP.ownJID, "to": JID, "id":"retrieve1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("items", {"node":"urn:xmpp:avatar:data"})
		.c("item", {"id":XMPP.GetUniqueID()});
		XMPP.conn.sendIQ(req,function(iq){
				var avatarData = "data:image/png;base64," + iq.getElementsByTagName("data")[0].innerHTML;
				if(requestJID in XMPP.roster)
					XMPP.roster[requestJID].avatar = avatarData;
				else if(requestJID == XMPP.ownJID)
					XMPP.ownAvatar = avatarData;
				setTimeout(function(){callback(avatarData,requestJID);}, 500);
			});
		return true;
    },
    
    SetAvatar: function(avatarSrc,callback){
		var req=$iq({"type":"set", "from": XMPP.ownJID, "id":"publish1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("publish", {"node":"urn:xmpp:avatar:data"})
		.c("item", {"id":XMPP.GetUniqueID()})
		.c("data", {"xmlns":'urn:xmpp:avatar:data'})
		.t(avatarSrc);	console.info(req.tree());
		XMPP.conn.sendIQ(req,function(iq){console.info(iq);
			callback(true);
		},function(iq){console.warn(iq);
			callback(false);
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


	GetUniqueID: function() { XMPP.conn.getUniqueId("my:code"); },

//================================================== 
//			MESSAGING
//================================================== 

	OnMessage: null,
	HandleMessageObject: function(newMessageObject)
	{
		if(!(newMessageObject.from in XMPP.roster)) { XMPP.roster[newMessageObject.from] = {messages: []}; }
		XMPP.roster[newMessageObject.from].messages.push(newMessageObject);
		if (newMessageObject.ownership=='message-other')
		{
			if (XMPP.roster[newMessageObject.from].OnMessage != null) { XMPP.roster[newMessageObject.from].OnMessage(newMessageObject.body); }
			if (XMPP.OnMessage!=null) { XMPP.OnMessage(newMessageObject.from,newMessageObject.body); }
		}
	},

	OnMessageStanza: function(stanza)
	{	//console.log(stanza);
		if (stanza.attributes.type.value=="chat")
		{
			for (i=0; i<stanza.childNodes.length; i++)
			{
				from=stanza.attributes["from"].value.match(/^[^\/]*/)[0];
				if(stanza.childNodes[i].localName=="body")
				{
					messageBody=stanza.childNodes[i].innerHTML;
					newMessageObject=
					{
						from:from,
						type:stanza.attributes.type.value,
						to:stanza.to,
						body:messageBody,
						ownership:'message-other',
						timestamp:new Date().getTime(),
			
					}
					XMPP.HandleMessageObject(newMessageObject);

					if (XMPP.OnStoppedTyping !=null) { XMPP.OnStoppedTyping(from); }
				}
				else if(stanza.childNodes[i].localName=="composing" && XMPP.OnStartedTyping != null)
				{
					XMPP.OnStartedTyping(from);
				}
				else if(stanza.childNodes[i].localName=="pause" && XMPP.OnStoppedTyping != null)
				{
					XMPP.OnStoppedTyping(from);
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
	SendPrivateMessage: function(to,message)
	{
		var imc = $msg({"id":XMPP.GetUniqueID(), "to":to, 'type':'chat'}).c("body").t(message);
		XMPP.conn.send( imc.tree());
		if(!(to in XMPP.roster))
		{
			XMPP.roster[to]= { jid:to, temporary:true, screenName:to.match(/^[^@]*/)[0], messages:[] };
		}
		newMessageObject=
		{
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

	OnMessageCarbonReceived(carbon)
	{
		// Check if carbon is a message
		console.info(carbon);
		if(carbon.type != undefined){
			newMessageObject={};
			if (carbon.direction=='sent')
			{
				newMessageObject=
				{
					from:XMPP.ownJID,
					to:carbon.to,
					ownership:'message-own',
				}
			}
			else
			{
				newMessageObject=
				{
					from:carbon.to,
					to:XMPP.ownJID,
					ownership:'message-other',
				}
			}
			newMessageObject.type=carbon.type;
			newMessageObject.body=carbon.innerMessage;
			newMessageObject.timestamp=new Date().getTime();
			XMPP.HandleMessageObject(newMessageObject);
		}
		else if(carbon.direction=='received')
		{
			var message = carbon.innerMessage.prevObject[0];
			if(XMPP.OnSubscriptionMessage != null && message.getElementsByTagName("event")[0].getAttribute("xmlns") == "http://jabber.org/protocol/pubsub#event")
			{
				var nodeName = message.getElementsByTagName("items")[0].getAttribute("node");
				var pubsubServer = message.getAttribute("from");
				var nodeItem = message.getElementsByTagName("item")[0];
				XMPP.OnSubscriptionMessage(
						nodeName + "@" + pubsubServer,
						nodeItem.getAttribute("id"),
						nodeItem.getElementsByTagName("title")[0].innerHTML,
						nodeItem.getElementsByTagName("summary")[0].innerHTML,
						nodeItem.getElementsByTagName("published")[0].innerHTML
						);
			}
				
		}
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


//================================================== 
//			VCARD
//================================================== 


	RequestVcard: function(from,callback)
	{
		console.warn("RequestVcard is deprecated. Use RequestVCard instead");
		XMPP.ReqestVCard(from,callback);
	},
	RequestVCard: function(from,callback)
	{
		from=from.replace(/\/.*$/,'');		// remove ressource
		XMPP.conn.vcard.get(
					function success(iq)
					{
						var vcard = iq.getElementsByTagName("vCard")[0];
						callback(getXMLToArray(vcard),from);
					}
					,from,
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
		console.warn("ChangeVcardNick is depcrecated. Use ChangeVCardNick instead.");
		ChangeVCardNick(to);
	},
	ChangeVCardNick: function(to)
	{
		var req=$iq({"id":GetUniqueID(), "type":"set"}).c("vCard", {"xmlns":"vcard-temp"});
		req.c("NICKNAME").t(to);
		XMPP.conn.send(req.tree());
		return true;
	},


//================================================== 
//		INBAND REGISTRATION
//================================================== 


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
		console.warn("XMPP.OnRegister is deprecated. It's a silly function.");
		switch(nStatus)
		{
			default: OnConnectionStatus(nStatus);
		}
		return true;
	},


//================================================== 
//		HTTP UPLOAD
//================================================== 

	RequestServices: function(callback)
	{
		var server = XMPP.ownJID.split("@")[1];
		//  var req=$iq({"type":"get", from: XMPP.ownJID, to:server}).c("query", {"xmlns":"http://jabber.org/protocol/disco#items"});
		var req=$iq({"type":"get", from: XMPP.ownJID, to:server}).c("query", {"xmlns":"http://jabber.org/protocol/disco#info"});
		XMPP.conn.sendIQ(req,
			function(iq)
			{

				// Searching for upload-service
				var identities = iq.getElementsByTagName("identity");
				for(i=0; i<identities.length; i++)
				{
					if(identities[i].getAttribute("type") == "file")
						XMPP.httpUploadEnabled = true;
					if(identities[i].getAttribute("category") == "pubsub")
						XMPP.pubsubServer = "pubsub." + XMPP.ownDomain;
				}
				var features = iq.getElementsByTagName("feature");
				for (i=0; i<features.length; i++)
				{
					if (features[i].getAttribute("var")=="urn:xmpp:http:upload")
						XMPP.httpUploadEnabled = true;
					if(XMPP.pubsubServer != null && features[i].getAttribute("var") == "http://jabber.org/protocol/pubsub#publish")
						XMPP.pubsubServer = "pubsub." + XMPP.ownDomain;
					
				}
				if(!XMPP.httpUploadEnabled)
					console.warn("No HTTP_Upload found on server!");
				if(!XMPP.pubsubServer)
					console.warn("No pubsub found on server!");		
				callback(true);
			},
			function(iq)
			{
				console.warn("Requesting services yields error:");
				console.log(iq);
				callback(false);
			});
		return true;
	},
	
	RequestUploadSlot: function(filename,size,type,callback)
	{
	    	var server = XMPP.ownJID.split("@")[1];
	    	var uploadServer = "upload." + server;
	    	var req=$iq({"type":"get", from: XMPP.ownJID, to:server}).c("request", {"xmlns":"urn:xmpp:http:upload","filename":filename,"size":size,"content-type":type});
	    	req.c("filename").t(filename); //Prosody needs this as children and not as attributes :-(
	    	req.up().c("size").t(size);
	    	req.up().c("content-type").t(type);
	    	XMPP.conn.sendIQ(req,
			function(iq)	// if successful
			{
				callback(iq.getElementsByTagName("get")[0].innerHTML,iq.getElementsByTagName("put")[0].innerHTML);
			},
			function(iq)	// else
			{
				callback(false);
				console.warn("Could not request upload slot");
			});
		return true;
	},
	
	/*RequestAllUploadServices: function(){  // Maybe for other servers we need other requests, at this moment http_upload only works with prosody!
	    	var server = XMPP.ownJID.split("@")[1];
	    	var req=$iq({"type":"get", from: XMPP.ownJID, to:server}).c("query", {"xmlns":"http://jabber.org/protocol/disco#items"});
	    	XMPP.conn.sendIQ(req,function(iq){console.log(iq);},function(iq){console.log(iq);});
	    	return true;
	},*/
	
	UploadFile: function(file,progressCallback)
	{
	    	if(!XMPP.httpUploadEnabled) return false;
	    	XMPP.RequestUploadSlot(file.name,file.size,file.type,function(get,put)
		{
			http= new XMLHttpRequest();
			http.file=file;
			http.addEventListener('progress', function(progressObject)
			{
				if (progressCallback!=null)
				{
					var progress=progressObject.position || progressObject.loaded;
					var total=progressObject.totalSize || progressObject.total;
					progressCallback(progress/total);
				}
			});
			http.addEventListener('load', function()
			{
					// console.log(http.responseText);
			});
			form= new FormData();
			form.append("file",file);
			http.open('post', put, true);
			http.send(form);
			// callbackGet(get);		// what's whith this ....
		
			/* We need to send a http-PUT-request with the file to the server, at this moment I have no solution for this. The ajax-Request doesnt work :-( */
			    /*$.ajax({
				type: 'GET',
				    url: get,
				crossDomain: true,
					data: file,
				dataType: 'json',
					contentType: file.type,
				success: function(responseData, textStatus, jqXHR) 
				{
				    callbackReady();
				},
				error: function (responseData, textStatus, errorThrown) 
				{
				    console.warn("ERROR!");
				}
			    });*/
	
	    	});
	    	return true;
	},
    

//================================================== 
//  			PUBSUBS	
//================================================== 
    
    CreateNode: function(nodeJID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"create1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("create", {"node":nodeJID[0]});
		XMPP.conn.sendIQ(req,function(iq){
				console.log("Success!");
				console.info(iq);
				callback(true);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    DeleteNode: function(nodeJID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"delete1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub#owner"})
		.c("delete", {"node":nodeJID[0]});
		XMPP.conn.sendIQ(req,function(iq){
				console.log("Success!");
				console.info(iq);
				callback(true);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    SubscribeNode: function(nodeJID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"sub1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("subscribe", {"node":nodeJID[0], "jid":XMPP.ownJID});
		XMPP.conn.sendIQ(req,function(iq){
				XMPP.groups[nodeJID[0] + "@" + nodeJID[1]] = "subscribed";
				callback(true);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    UnsubscribeNode: function(nodeJID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"unsub1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("unsubscribe", {"node":nodeJID[0], "jid":XMPP.ownJID});
		XMPP.conn.sendIQ(req,function(iq){
				delete XMPP.groups[nodeJID[0] + "@" + nodeJID[1]];
				callback(true);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    GetNodeSubscriptions: function(nodeJID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"get", "from": XMPP.ownJID, "to":nodeJID[1], "id":"subscriptions1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("subscriptions");
		XMPP.conn.sendIQ(req,function(iq){
				console.log("Success!");
				console.info(iq);
				var subscriptions = iq.getElemensByTagName("subscription");
				callback(subscriptions);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    // Publishes a new item in a node and gives the id of the new item in the callback-function
    PublishNodeItem: function(nodeJID,text,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"publish1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("publish", {"node":nodeJID[0]})
		.c("item", {"id":hashCode(XMPP.ownJID + text + (new Date()))})
		.c("entry", {"xmlns":"http://www.w3.org/2005/Atom"})
		.c("title").t(XMPP.ownJID).up()
		.c("summary").t(text).up()
		.c("published").t(new Date()).up();
		XMPP.conn.sendIQ(req,function(iq){
				callback(iq.getElementsById("item")[0].getAttribute("id"));
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    DeleteNodeItem: function(nodeJID,itemID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"retract1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("retract", {"node":nodeJID[0]})
		.c("item", {"id":itemID});
		XMPP.conn.sendIQ(req,function(iq){
				console.log("Success!");
				console.info(iq);
				callback(true);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },

    DeleteAllNodeItems: function(nodeJID,callback){
    	nodeJID = nodeJID.split("@");
		var req=$iq({"type":"set", "from": XMPP.ownJID, "to":nodeJID[1], "id":"purge1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("purge", {"node":nodeJID[0]});
		XMPP.conn.sendIQ(req,function(iq){
				console.log("Success!");
				console.info(iq);
				callback(true);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },
    
    GetNodeItems: function(nodeJID,callback){
    	var nodeJID = nodeJID.split("@");
		var req=$iq({"type":"get", "from": XMPP.ownJID, "to":nodeJID[1], "id":"items1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("items", {"node":nodeJID[0]});
		XMPP.conn.sendIQ(req,function(iq){
				var postings = new Array;console.log(iq);
				var items = iq.getElementsByTagName("item");
				for(var i=0; i<items.length; i++){
					postings.push({
						"id": items[i].getAttribute("id"),
						"from": items[i].getElementsByTagName("title")[0].innerHTML,
						"body": items[i].getElementsByTagName("summary")[0].innerHTML,
						"timestamp": (new Date(items[i].getElementsByTagName("published")[0].innerHTML)).getTime()
					});
				}
				postings.sort(function(a, b) {
	                return b.timestamp - a.timestamp;   });
				callback(postings);
			},
			function(iq){
				console.warn("Failure!");
				console.info(iq);
				callback(false);
			});
		return true;
    },
    
    GetAllSubscriptions: function(pubsubServer, callback){
		var req=$iq({"type":"get", "from": XMPP.ownJID, "to":pubsubServer, "id":"subscriptions1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("subscriptions");
		XMPP.conn.sendIQ(req,function(iq)
			{
				var subscriptions = {};
				var items = iq.getElementsByTagName("subscription");
				for(var i=0; i<items.length; i++) subscriptions[items[i].getAttribute("node") + "@" + pubsubServer] = "subscribed";
				callback(subscriptions);
			},
			function(iq)
			{
				console.warn("Could not get pubsub subscriptions");
				console.info(iq);
				callback(false);
			});
		return true;
    },
    
    GetAllFollower: function(nodeJID, callback){
    	var nodeJID = nodeJID.split("@");
		var req=$iq({"type":"get", "from": XMPP.ownJID, "to":nodeJID[1], "id":"subman1"})
		.c("pubsub", {"xmlns":"http://jabber.org/protocol/pubsub"})
		.c("subscriptions", {"node":nodeJID[0]});
		XMPP.conn.sendIQ(req,function(iq)
			{	
				var follower = new Array;
				var items = iq.getElementsByTagName("subscription");
				for(var i=0; i<items.length; i++) follower.push(items[i].getAttribute("jid"));
				callback(follower);
			},
			function(iq)
			{
				console.warn("Could not get node follower");
				console.info(iq);
				callback(false);
			});
		return true;
    },
    
    OnSubscriptionMessage: null,

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

function hashCode(s){
	  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
	}
