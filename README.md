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

Login:
```javascript
   XMPP.Init();
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

Get roster
```javascript
   XMPP.RefreshRoster(function(roster)
   {
   	for (jid in roster) { myRoster.add(jid); }
   }
```

Send Message:
```javascript
   XMPP.sendPrivateMessage('juliette@shakesbeer.org','hey bitch u wanna');
```


MUC:
```javascript
   XMPP.joinMuc('garden@conference.the-capulets.org', 'MontagueLoverboy', function(from,body) { alert('message from '+'from: '+body); }) ;
   XMPP.conn.muc.groupchat('garden@conference.the-capulets.org', 'Yo julester u there???');
```
