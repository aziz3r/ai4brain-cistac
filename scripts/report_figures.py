"""Reproducible simulation for the technical report (seeded). Uses the deployed engine backend/app/core/engine.py.

Generative model (deliberately different from the estimator, to test misspecification):
  true ability  theta_t = theta_{t-1} + N(0, 1.0^2),  theta_0 ~ N(65, 10^2) per dimension
  raw score     = clip(theta_t + practice(s) + N(0, 8^2)),  practice(s) = 6 * exp(-s / 4)
  lapses        with prob 4% the raw score is U(0, 25) (attention lapse / input glitch)
  RT            = baseline (neutral speed modifier), difficulty = 1.0
Outputs data tables for pgfplots and results.json.
"""
import json
import math
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
from app.core.engine import BrainTwinEngine as E  # noqa: E402

OUT = os.path.join(ROOT, "docs", "ieee_report", "data")
os.makedirs(OUT, exist_ok=True)
N_USERS, N_SESS, N_DIM, SEED = 200, 12, 5, 7


def simulate(outlier_z, lapse_p=0.04, seed=SEED):
    E.OUTLIER_THRESHOLD = outlier_z
    rnd = random.Random(seed)
    rows = []  # per user-dim trajectories
    for _ in range(N_USERS * N_DIM):
        th = min(90, max(35, rnd.gauss(65, 10)))
        mu, sg = 50.0, 25.0
        traj = []
        for s in range(N_SESS):
            th = min(100, max(0, th + rnd.gauss(0, 1.0)))
            lapse = rnd.random() < lapse_p
            raw = rnd.uniform(0, 25) if lapse else min(100, max(0, th + 6 * math.exp(-s / 4) + rnd.gauss(0, 8)))
            r = E.update_dimension(mu, sg, raw, 500, 500, 1.0, s + 1)
            mu, sg = r["mu_post"], r["sigma_post"]
            traj.append(dict(mu=mu, sigma=sg, theta=th, lo=r["ci_95_lower"], hi=r["ci_95_upper"],
                             damped=r["outlier_damped"], lapse=lapse))
        rows.append(traj)
    return rows


def summarize(rows):
    out = []
    for s in range(N_SESS):
        sig = [t[s]["sigma"] for t in rows]
        err = [t[s]["mu"] - t[s]["theta"] for t in rows]
        cov = [t[s]["lo"] <= t[s]["theta"] <= t[s]["hi"] for t in rows]
        out.append(dict(session=s + 1,
                        sigma=sum(sig) / len(sig),
                        rmse=math.sqrt(sum(e * e for e in err) / len(err)),
                        bias=sum(err) / len(err),
                        coverage=100 * sum(cov) / len(cov)))
    return out


def pearson(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den


def main():
    rob = simulate(3.0)
    non = simulate(1e9)
    s_rob, s_non = summarize(rob), summarize(non)
    with open(os.path.join(OUT, "convergence.dat"), "w") as f:
        f.write("session sigma rmse_rob rmse_non cov_rob cov_non bias_rob\n")
        for a, b in zip(s_rob, s_non):
            f.write(f"{a['session']} {a['sigma']:.3f} {a['rmse']:.3f} {b['rmse']:.3f} {a['coverage']:.1f} {b['coverage']:.1f} {a['bias']:.3f}\n")

    flat = [x for t in rob for x in t]
    lapses = [x for x in flat if x["lapse"]]
    det = sum(1 for x in lapses if x["damped"]) / max(1, len(lapses))
    fp = sum(1 for x in flat if x["damped"] and not x["lapse"]) / max(1, sum(1 for x in flat if not x["lapse"]))
    # test-retest of the final-session mu vs the true ability, and split-half style between sessions 8 and 12
    r_true = pearson([t[-1]["mu"] for t in rob], [t[-1]["theta"] for t in rob])
    r_8_12 = pearson([t[7]["mu"] for t in rob], [t[-1]["mu"] for t in rob])
    # worked example of a lapse (one trajectory with a forced zero at session 7)
    E.OUTLIER_THRESHOLD = 3.0
    ex = []
    mu, sg = 50.0, 25.0
    raws = [72, 70, 74, 71, 73, 70, 3, 72, 71, 73, 70, 72]
    for s, raw in enumerate(raws):
        r = E.update_dimension(mu, sg, raw, 500, 500, 1.0, s + 1)
        mu, sg = r["mu_post"], r["sigma_post"]
        ex.append((s + 1, raw, mu, r["ci_95_lower"], r["ci_95_upper"], r["outlier_damped"]))
    with open(os.path.join(OUT, "lapse_example.dat"), "w") as f:
        f.write("session raw mu lo hi damped\n")
        for e in ex:
            f.write(f"{e[0]} {e[1]} {e[2]:.2f} {e[3]:.2f} {e[4]:.2f} {int(e[5])}\n")
    # projection cone from the last example state: sigma_k = sqrt(sigma^2 + k Q)
    q = E.DEFAULT_DRIFT_Q
    with open(os.path.join(OUT, "cone.dat"), "w") as f:
        f.write("k mu lo hi\n")
        for k in range(0, 9):
            sk = math.sqrt(sg ** 2 + k * q * 4)  # k in weeks, assuming ~4 sessions per week
            f.write(f"{k} {mu:.2f} {max(0, mu - 1.96 * sk):.2f} {min(100, mu + 1.96 * sk):.2f}\n")

    res = dict(n_users=N_USERS, n_dims=N_DIM, n_sessions=N_SESS, seed=SEED,
               sigma_s1=s_rob[0]["sigma"], sigma_s3=s_rob[2]["sigma"], sigma_s5=s_rob[4]["sigma"],
               sigma_s12=s_rob[-1]["sigma"],
               rmse_s1=s_rob[0]["rmse"], rmse_s12_rob=s_rob[-1]["rmse"], rmse_s12_non=s_non[-1]["rmse"],
               cov_s12_rob=s_rob[-1]["coverage"], cov_s12_non=s_non[-1]["coverage"],
               cov_mean_rob=sum(x["coverage"] for x in s_rob[2:]) / len(s_rob[2:]),
               bias_s3=s_rob[2]["bias"], bias_s12=s_rob[-1]["bias"],
               lapse_detection=100 * det, false_damping=100 * fp,
               r_final_vs_true=r_true, r_s8_s12=r_8_12,
               lapse_example_mu_before=ex[5][2], lapse_example_mu_after=ex[6][2], lapse_example_damped=ex[6][5])
    json.dump(res, open(os.path.join(OUT, "results.json"), "w"), indent=1)
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
