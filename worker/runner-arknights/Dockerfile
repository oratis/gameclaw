# GameClaw L3 Worker — Arknights
#
# Wraps MAA (MaaAssistantArknights) inside an Android-in-Docker base.
# This image is run as a Cloud Run Job execution per task.
#
# Usage at runtime:
#   docker run --rm \
#     -e TASK_ID=task_xxx \
#     -e CALLBACK_TOKEN=hex64 \
#     -e CALLBACK_URL=https://gogameclaw.com \
#     gameclaw-runner-arknights:latest
#
# IMPORTANT — Android base requires KVM:
#   redroid (Android-in-Docker) needs /dev/binder, /dev/ashmem, and KVM
#   passthrough. This means:
#     - Cloud Run Jobs DOES NOT support this directly (no /dev/kvm).
#     - Recommended deployment is GCE Compute VMs (n2-standard-2+, with
#       nested virtualization enabled) running this image, OR
#       a Kubernetes cluster on GKE with privileged + KVM nodes.
#   See ../WORKER_SETUP.md for the deployment matrix.

# Base: redroid Android 13. Replace with whichever Android version Arknights
# is currently happy on (tested: 11, 13).
FROM redroid/redroid:13.0.0_64only-latest AS android

# ------------------------------------------------------------------------------
# Build the runner harness on top
# ------------------------------------------------------------------------------
FROM debian:bookworm-slim AS runner-base

ARG MAA_VERSION=5.21.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates jq python3 python3-pip android-tools-adb \
    libgl1 libxml2 libxslt1.1 libssl3 unzip xz-utils \
  && rm -rf /var/lib/apt/lists/*

# Install MAA core (https://github.com/MaaAssistantArknights/MaaAssistantArknights)
RUN mkdir -p /opt/maa && \
    curl -fsSL "https://github.com/MaaAssistantArknights/MaaAssistantArknights/releases/download/v${MAA_VERSION}/MAA-v${MAA_VERSION}-linux-x86_64.tar.gz" \
      | tar xz -C /opt/maa --strip-components=1

WORKDIR /app

# Python deps for the runner harness
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy runner code
COPY runner.py .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh /app/runner.py

# Healthcheck-style env documentation. Real values are injected per execution.
ENV TASK_ID=
ENV CALLBACK_TOKEN=
ENV CALLBACK_URL=
ENV MAA_RESOURCE_DIR=/opt/maa/resource
ENV MAA_LIB_DIR=/opt/maa

# Note: in production, the Arknights APK + game resources must already be
# installed in the Android base layer's /data partition (cannot be
# redistributed via this image due to Hypergryph's TOS). See
# ../WORKER_SETUP.md for installation steps.

ENTRYPOINT ["/entrypoint.sh"]
