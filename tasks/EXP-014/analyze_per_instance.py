import json,sys,dataclasses
sys.path.insert(0,".")
from ai.perception.pose_tracker import PoseObservation
from ai.runtime.pipeline import DriverPipeline, FaceObservation, PhoneObservation
from ai.runtime.thresholds import load_thresholds
d=json.load(open("docs/experiments/live_session_4.json",encoding="utf-8"))
marks=d["marks"];fr=d["frames"]
# instances
inst=[];cnt={}
for i,m in enumerate(marks):
    n=m["phase"];cnt[n]=cnt.get(n,0)+1
    end=marks[i+1]["t"] if i+1<len(marks) else fr[-1]["t"]
    inst.append((f"{n}#{cnt[n]}",m["t"],end))
def run(ctx):
    th=dataclasses.replace(load_thresholds(),use_pose_fallback=True,use_yawn_context=ctx)
    p=DriverPipeline(th);ev=[]
    for f in fr:
        if f["t"]<marks[0]["t"]:continue
        face=FaceObservation(f["ear"],f["mar"],f["yaw"],f["pitch"],0.0) if f["face_detected"] else None
        pd=f.get("pose");pose=None
        if isinstance(pd,dict) and pd.get("person") and pd.get("yaw") is not None and pd.get("pitch") is not None:
            pose=PoseObservation(keypoints=(),yaw_proxy=float(pd["yaw"]),pitch_proxy=float(pd["pitch"]),ear_asym=float(pd["ear_asym"] or 0),observed_at=float(f["t"]))
        _,e=p.update(f["t"],face,PhoneObservation(f.get("phone_detected",False),False),pose)
        for x in e:
            if x["event_type"] in("DROWSINESS_ACUTE","YAWNING"):ev.append((f["t"],x["event_type"]))
    return ev
A=run(False);B=run(True)
# MAR/EAR per instance
for name,s,e in inst:
    if name=="end#1":continue
    fs=[f for f in fr if s<=f["t"]<e and f["face_detected"]]
    mar=max((f["mar"] for f in fs),default=0);ear=min((f["ear"] for f in fs),default=0)
    def w(ev,k):return [round(t-s,1) for t,x in ev if s<=t<e and x==k]
    print(f"{name:14s} marmax={mar:.2f} earmin={ear:.2f} | A yawn{w(A,'YAWNING')} acute{w(A,'DROWSINESS_ACUTE')} | B yawn{w(B,'YAWNING')} acute{w(B,'DROWSINESS_ACUTE')}")
