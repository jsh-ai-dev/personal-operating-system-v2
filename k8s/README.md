# mk2 Kubernetes (Learning-Friendly Standard)

This setup keeps things practical: not minimal-only, not production-heavy.

## Included

- `Namespace`
- `ConfigMap` + `Secret`
- `Postgres` (StatefulSet + PVC + Service)
- `Redis` (Deployment + PVC + Service)
- `Auth`, `API`, `Web` (Deployment + Service)
- `Ingress` (`/` to web)

## Apply

1) Create local secret file (not committed):

```bash
cp k8s/base/secret.example.yaml k8s/base/secret.yaml
```

2) Apply:

```bash
kubectl apply -k k8s/base
kubectl -n pos-mk2 get all
```

## AWS overlay

Use this when DB is external (RDS) and app workloads run on EKS.
Redis can run on a separate data-box EC2.

1) Prepare overlay secret:

```bash
cp k8s/overlays/aws/secret.aws.example.yaml k8s/overlays/aws/secret.aws.yaml
# edit RDS/Redis/JWT values
```

2) In `k8s/overlays/aws/kustomization.yaml`, replace ECR image URIs.

3) Apply:

```bash
kubectl apply -k k8s/overlays/aws
kubectl -n pos-mk2 get all
```

## AWS direction (your plan)

- Run `mk1`, `mk2`, `mk3` workloads on the `t3.large` Kubernetes node.
- Keep mk1 Elasticsearch on a separate `t3.small`.
- Use internal DNS/service endpoint from app config when you connect across nodes.
