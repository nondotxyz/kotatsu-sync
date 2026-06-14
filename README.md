<table>
  <tr>
    <td align="center">
      <img src="src/assets/subaru_host_phone.jpg" width="300"><br>
    </td>
	<td>
	<img src="public/wxt.svg" width="200">
	</td>
    <td align="center">
      <img src="src/assets/usami_join_phone.jpg" width="300"><br>
    </td>
  </tr>
</table>

# Kotatsu Sync

Kotatsu Sync is a browser extension that lets you sync playback between two instances of [animepahe](https://animepahe.pw) so you can watch together with a friend.

# Why?

Cause I want it, and I need it, and nothing else works like I wanted so I built what works for me.

# How does it work?

Kotatsu Sync uses PeerJS and WebRTC to establish a direct connection between two clients. Once connected, it periodically exchanges playback events and metadata to keep both viewers in sync.
A common misconception is that WebRTC is used to stream the video itself. It isn't. The video continues to come directly from [animepahe](https://animepahe.pw). Only metadata such as playback state, timestamps, and sync events are exchanged between peers.

# Can it work for more than 2 people?

As it is coded right now, it is only limited to 2 peer-to-peer communcation, but with a few modifications, it can work.
Unfortunately, not the biggest priority as of right now.

It's also not scalable for very large party of 10+ people because the nature of it being a peer-to-peer, the scalability depends on the host internet connection, that means if one connection can mantain a 2mbps/second traffic, 10+ connection will have a 20mbps/second traffic with increased latency. Accomodating that traffic will require pivoting to a more traditional server - client solution.

As far as I know there isn't a good solution yet, if you have the time or the solution for that, [it would make for a fun side project](https://github.com/new) \*smug\*

# Contribution

Please, god. I never wanna mantain this ever. (in other words, any contribution is appreciated :3) Thank you <3
