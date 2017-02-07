# catastrophe

Idiot compatibilitiy layer for strophe.js

Include catastrophe
```javascript
   <script src='lib/catastrophe/catastrophe.js'></script>
```

Include needed plugins:
```javascript
   <script src='lib/strophejs/strophe.min.js'></script>
   <script src='lib/strophejs-plugins/strophe.roster.js'></script>
   <script src='lib/strophejs-plugins/strophe.muc.js'></script>
```

Register:
```javascript
   XMPP.RegisterUser(name,pass,server,function(result){
   switch(result)
   {
      case 'ok': alert("It worked");break;
      case 'conflict': alert("Username is taken");break;
      case 'not acceptable': alert("Invalid username or password");break;
      case 'regifail': alert("Registration disabled");break;
   }
   })
```

Login:
```javascript
   XMPP.Init('https://openim.de/http-bind/');
   XMPP.Login('romeo@shakesbeer.org','ilovejulialol');
```

When connected:
```javascript
   XMPP.OnCustomConnected=function()
   {
   	// Whatev...
   }
```

When message received:
```javascript
  XMPP.OnMessage=function(from,body) { alert("Message from "+from+": body"); }
  XMPP.roster['juliet@shakesbeer.org']=function(body) { document.GetElementByID["lastMessage"].innerHTML="received: "+body;  }
```
Also try: XMPP.OnDisconnect

Get roster
```javascript
   XMPP.RefreshRoster(function(roster)
   {
   	for (jid in roster) { myRoster.add(jid, roster[jid].screenName); }
   }
```

Add contact to roster
```javascript
   XMPP.AddToRoster('juliette@shakesbeer.org','juliette');
```

Remove contact from roster
```javascript
   XMPP.RemoveFromRoster('juliette@shakesbeer.org');
```
On new friendship-requests or accepted request
```javascript
   XMPP.OnSubRequest = function(jid){ alert(jid + ' wants to be your friend!'); }
   XMPP.OnSubRequestAccepted = function(jid){ alert(jid + ' has accepted your friendship-request!'); }
```	

Send Message:
```javascript
   XMPP.SendPrivateMessage('juliette@shakesbeer.org','hey bitch u wanna');
```


MUC:
```javascript
   themuc = XMPP.JoinMuc('garden@conference.the-capulets.org', 'MontagueLoverboy', function(from,body) { alert('message from '+'from: '+body); }) ;
   themuc.SendMessage("hey guys!");
   XMPP.mucs['garden@conference.the-capulets.org'].SendMessage("soup");
   XMPP.mucs['garden@conference.the-capulets.org'].InviteUser("jooliet@shakespear.lit", "get ur ass here");
```

