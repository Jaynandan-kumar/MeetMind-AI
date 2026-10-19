import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../config/socket";
import toast from "react-hot-toast";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export const useWebRTC = (roomId, user, onMeetingEnded, enabled = true) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]); // Array of { socketId, userId, userName, stream, audioEnabled, videoEnabled }
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
    const localStreamRef = useRef(null);
    const cameraTrackRef = useRef(null);
    const screenTrackRef = useRef(null);

    // Initialize local media stream
    const initLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            toast.error("Could not access camera/microphone");
            console.error("Media devices access error:", error);
            // Fallback: try audio only
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = audioStream;
                setLocalStream(audioStream);
                setVideoEnabled(false);
                return audioStream;
            } catch (err) {
                console.error("Audio-only fallback error:", err);
                return null;
            }
        }
    }, []);

    // Create RTCPeerConnection for a target socket
    const createPeerConnection = useCallback((targetSocketId, targetUser) => {
        if (peersRef.current.has(targetSocketId)) {
            return peersRef.current.get(targetSocketId);
        }

        const peer = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks to peer connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                peer.addTrack(track, localStreamRef.current);
            });
        }

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    targetSocketId,
                    senderSocketId: socket.id,
                    candidate: event.candidate,
                });
            }
        };

        // Handle incoming remote stream tracks
        peer.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setRemoteUsers((prev) => {
                const existingIndex = prev.findIndex((u) => u.socketId === targetSocketId);
                if (existingIndex > -1) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        stream: remoteStream,
                    };
                    return updated;
                } else {
                    return [
                        ...prev,
                        {
                            socketId: targetSocketId,
                            userId: targetUser?.userId,
                            userName: targetUser?.userName || "Participant",
                            stream: remoteStream,
                            audioEnabled: targetUser?.audioEnabled ?? true,
                            videoEnabled: targetUser?.videoEnabled ?? true,
                        },
                    ];
                }
            });
        };

        peersRef.current.set(targetSocketId, peer);
        return peer;
    }, []);

    // Main WebRTC & Socket signaling setup effect
    useEffect(() => {
        if (!roomId || !user || !enabled) return;

        let isMounted = true;

        const startSession = async () => {
            const stream = await initLocalStream();

            if (!isMounted) return;

            if (!socket.connected) {
                socket.connect();
            }

            // Emit join room
            socket.emit("join-room", {
                roomId,
                user,
                audioEnabled: true,
                videoEnabled: true,
            });

            // 1. Receive all existing users in room
            socket.on("all-users", (existingUsers) => {
                setRemoteUsers((prev) => {
                    const newUsers = existingUsers.filter((eu) => !prev.some((p) => p.socketId === eu.socketId));
                    return [
                        ...prev,
                        ...newUsers.map((u) => ({
                            socketId: u.socketId,
                            userId: u.userId,
                            userName: u.userName || "Participant",
                            stream: null,
                            audioEnabled: u.audioEnabled ?? true,
                            videoEnabled: u.videoEnabled ?? true,
                        })),
                    ];
                });

                existingUsers.forEach((existingUser) => {
                    const peer = createPeerConnection(existingUser.socketId, existingUser);

                    // Create offer to existing user
                    peer.createOffer()
                        .then((offer) => peer.setLocalDescription(offer))
                        .then(() => {
                            socket.emit("offer", {
                                targetSocketId: existingUser.socketId,
                                callerSocketId: socket.id,
                                sdp: peer.localDescription,
                            });
                        })
                        .catch((err) => console.error("Error creating offer:", err));
                });
            });

            // 2. Someone new joined -> add to state
            socket.on("user-joined", (newUser) => {
                toast(`${newUser.userName} joined the meeting`, { icon: "👋" });
                setRemoteUsers((prev) => {
                    if (prev.some((u) => u.socketId === newUser.socketId)) return prev;
                    return [
                        ...prev,
                        {
                            socketId: newUser.socketId,
                            userId: newUser.userId,
                            userName: newUser.userName || "Participant",
                            stream: null,
                            audioEnabled: newUser.audioEnabled ?? true,
                            videoEnabled: newUser.videoEnabled ?? true,
                        },
                    ];
                });
                createPeerConnection(newUser.socketId, newUser);
            });

            // 3. Receive offer from caller
            socket.on("offer", async ({ callerSocketId, sdp, callerUser }) => {
                const peer = createPeerConnection(callerSocketId, callerUser);
                try {
                    await peer.setRemoteDescription(new RTCSessionDescription(sdp));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);

                    socket.emit("answer", {
                        targetSocketId: callerSocketId,
                        responderSocketId: socket.id,
                        sdp: peer.localDescription,
                    });
                } catch (err) {
                    console.error("Error handling offer:", err);
                }
            });

            // 4. Receive answer from responder
            socket.on("answer", async ({ responderSocketId, sdp }) => {
                const peer = peersRef.current.get(responderSocketId);
                if (peer) {
                    try {
                        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
                    } catch (err) {
                        console.error("Error setting remote description from answer:", err);
                    }
                }
            });

            // 5. Receive ICE candidate
            socket.on("ice-candidate", async ({ senderSocketId, candidate }) => {
                const peer = peersRef.current.get(senderSocketId);
                if (peer && candidate) {
                    try {
                        await peer.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error("Error adding ICE candidate:", err);
                    }
                }
            });

            // 6. Handle peer audio toggle
            socket.on("user-toggled-audio", ({ socketId, audioEnabled }) => {
                setRemoteUsers((prev) => prev.map((u) => (u.socketId === socketId ? { ...u, audioEnabled } : u)));
            });

            // 7. Handle peer video toggle
            socket.on("user-toggled-video", ({ socketId, videoEnabled }) => {
                setRemoteUsers((prev) => prev.map((u) => (u.socketId === socketId ? { ...u, videoEnabled } : u)));
            });

            // 8. Handle peer screen share toggle
            socket.on("user-toggled-screen-share", ({ socketId, isScreenSharing }) => {
                setRemoteUsers((prev) => prev.map((u) => (u.socketId === socketId ? { ...u, isScreenSharing } : u)));
            });

            // 9. Handle peer left
            socket.on("user-left", ({ socketId, user: leftUser }) => {
                if (leftUser) {
                    toast(`${leftUser.userName} left the meeting`);
                }
                const peer = peersRef.current.get(socketId);
                if (peer) {
                    peer.close();
                    peersRef.current.delete(socketId);
                }
                setRemoteUsers((prev) => prev.filter((u) => u.socketId !== socketId));
            });

            // 10. Handle meeting ended by host
            socket.on("meeting-ended", ({ message }) => {
                toast.error(message || "This meeting has ended");
                if (onMeetingEnded) {
                    onMeetingEnded(message);
                }
            });
        };

        startSession();

        // Cleanup on leave/unmount
        return () => {
            isMounted = false;

            // Stop local tracks & screen share
            if (screenTrackRef.current) {
                screenTrackRef.current.onended = null;
                screenTrackRef.current.stop();
            }
            if (cameraTrackRef.current) {
                cameraTrackRef.current.stop();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }

            // Close all peer connections
            peersRef.current.forEach((peer) => peer.close());
            peersRef.current.clear();

            // Off socket listeners
            socket.off("all-users");
            socket.off("user-joined");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("user-toggled-audio");
            socket.off("user-toggled-video");
            socket.off("user-toggled-screen-share");
            socket.off("user-left");
            socket.off("meeting-ended");

            socket.disconnect();
        };
    }, [roomId, user?.id, enabled, createPeerConnection, initLocalStream, onMeetingEnded]);

    // Toggle local mic
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                const newState = !audioEnabled;
                audioTrack.enabled = newState;
                setAudioEnabled(newState);
                socket.emit("toggle-audio", { roomId, audioEnabled: newState });
            }
        }
    };

    // Toggle local camera
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                const newState = !videoEnabled;
                videoTrack.enabled = newState;
                setVideoEnabled(newState);
                socket.emit("toggle-video", { roomId, videoEnabled: newState });
            }
        }
    };

    // Stop Screen Share
    const stopScreenShare = useCallback(() => {
        if (screenTrackRef.current) {
            screenTrackRef.current.onended = null;
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }

        const cameraTrack = cameraTrackRef.current;
        if (cameraTrack && cameraTrack.readyState === 'live') {
            peersRef.current.forEach((peer) => {
                const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(cameraTrack);
                }
            });

            if (localStreamRef.current) {
                const currentVideo = localStreamRef.current.getVideoTracks()[0];
                if (currentVideo) localStreamRef.current.removeTrack(currentVideo);
                localStreamRef.current.addTrack(cameraTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }
        } else {
            // Re-acquire camera
            navigator.mediaDevices?.getUserMedia({ video: true, audio: false }).then((camStream) => {
                const newCamTrack = camStream.getVideoTracks()[0];
                cameraTrackRef.current = newCamTrack;
                peersRef.current.forEach((peer) => {
                    const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
                    if (sender) sender.replaceTrack(newCamTrack);
                });
                if (localStreamRef.current) {
                    const vt = localStreamRef.current.getVideoTracks()[0];
                    if (vt) localStreamRef.current.removeTrack(vt);
                    localStreamRef.current.addTrack(newCamTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                }
            }).catch(err => console.error("Could not re-acquire camera:", err));
        }

        setIsScreenSharing(false);
        socket.emit("toggle-screen-share", { roomId, isScreenSharing: false });
        toast("Screen sharing stopped", { icon: "🖥️" });
    }, [roomId]);

    // Toggle Screen Share
    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            stopScreenShare();
            return;
        }

        try {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                toast.error("Screen sharing not supported on this browser");
                return;
            }

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: false,
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;

            screenTrackRef.current = screenTrack;

            // Preserve current camera track
            if (localStreamRef.current) {
                const currentCamTrack = localStreamRef.current.getVideoTracks()[0];
                if (currentCamTrack) {
                    cameraTrackRef.current = currentCamTrack;
                    localStreamRef.current.removeTrack(currentCamTrack);
                }
            }

            // Replace in all RTCPeerConnections
            peersRef.current.forEach((peer) => {
                const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });

            // Update local stream
            if (localStreamRef.current) {
                localStreamRef.current.addTrack(screenTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            } else {
                localStreamRef.current = screenStream;
                setLocalStream(screenStream);
            }

            setIsScreenSharing(true);
            setVideoEnabled(true);
            socket.emit("toggle-screen-share", { roomId, isScreenSharing: true });
            toast.success("Screen sharing started");

            // Native "Stop sharing" bar clicked in browser
            screenTrack.onended = () => {
                stopScreenShare();
            };
        } catch (error) {
            if (error?.name !== "NotAllowedError") {
                toast.error("Could not start screen share");
                console.error("Screen share error:", error);
            }
        }
    }, [isScreenSharing, roomId, stopScreenShare]);

    // End meeting for everyone (Host action)
    const endMeeting = useCallback(() => {
        if (roomId) {
            socket.emit("end-meeting", { roomId });
        }
    }, [roomId]);

    return {
        localStream,
        remoteUsers,
        audioEnabled,
        videoEnabled,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        endMeeting,
    };
};

export default useWebRTC;
