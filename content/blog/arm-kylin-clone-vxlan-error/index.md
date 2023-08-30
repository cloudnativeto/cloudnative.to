---
title: "Arm64 银河麒麟系统克隆机器上 k8s vxlan 跨节点不通的一次排查"
summary: "Arm64 的麒麟系统，克隆后网卡的 mac 不同，vxlan 的 vmac 却一样，如何解决？"
date: 2020-11-09T00:00:00+08:00
authors: ["张浩"]
categories: ["Kubernetes"]
tags: ["arm","vxlan","kylin"]
---

## 由来

和我博客前一篇文章 [银河麒麟 arm64 系统上 k8s 集群跨节点不通的一次排查](https://zhangguanzhang.github.io/2020/10/20/kylin-v10-k8s-overlay-error/) 不一样，从来没遇到过这样的问题，这里记录下。实施在客户那边部署业务后，业务在浏览器上无法访问，我远程上去查看日志发现 pod 内部无法 DNS 无法解析，nginx 连不上 upsteam 报错而启动失败，实际上也是跨节点不通。实际排查过程也有往错误的方向浪费了一些时间和尝试，就不写进来了，以正确的角度写下排查过程。

### 环境信息

OS 是 arm64 的银河麒麟系统：

```shell
$ cat /etc/os-release
NAME="Kylin Linux Advanced Server"
VERSION="V10 (Tercel)"
ID="kylin"
VERSION_ID="V10"
PRETTY_NAME="Kylin Linux Advanced Server V10 (Tercel)"
ANSI_COLOR="0;31"
$ uname -a
Linux localhost.localdomain 4.19.90-17.ky10.aarch64 #1 SMP Sun Jun 28 14:27:40 CST 2020 aarch64 aarch64 aarch64 GNU/Linux
```

集群信息（和集群版本没关系）：

```shell
$ kubectl version -o json
{
  "clientVersion": {
    "major": "1",
    "minor": "15",
    "gitVersion": "v1.15.12",
    "gitCommit": "e2a822d9f3c2fdb5c9bfbe64313cf9f657f0a725",
    "gitTreeState": "clean",
    "buildDate": "2020-05-06T05:17:59Z",
    "goVersion": "go1.12.17",
    "compiler": "gc",
    "platform": "linux/arm64"
  },
  "serverVersion": {
    "major": "1",
    "minor": "15",
    "gitVersion": "v1.15.12",
    "gitCommit": "e2a822d9f3c2fdb5c9bfbe64313cf9f657f0a725",
    "gitTreeState": "clean",
    "buildDate": "2020-05-06T05:09:48Z",
    "goVersion": "go1.12.17",
    "compiler": "gc",
    "platform": "linux/arm64"
  }
}
```

node 信息：

```shell
$ kubectl get node -o wide
NAME            STATUS   ROLES         AGE   VERSION    INTERNAL-IP     EXTERNAL-IP   OS-IMAGE                                   KERNEL-VERSION            CONTAINER-RUNTIME
172.18.27.252   Ready    master,node   32h   v1.15.12   172.18.27.252   <none>        Kylin Linux Advanced Server V10 (Tercel)   4.19.90-17.ky10.aarch64   docker://18.9.0
172.18.27.253   Ready    master,node   32h   v1.15.12   172.18.27.253   <none>        Kylin Linux Advanced Server V10 (Tercel)   4.19.90-17.ky10.aarch64   docker://18.9.0
172.18.27.254   Ready    master,node   32h   v1.15.12   172.18.27.254   <none>        Kylin Linux Advanced Server V10 (Tercel)   4.19.90-17.ky10.aarch64   docker://18.9.0
```

coredns 信息：

```shell
$ kubectl -n kube-system get po -o wide -l k8s-app=kube-dns
NAME                      READY   STATUS    RESTARTS   AGE     IP              NODE            NOMINATED NODE   READINESS GATES
coredns-677d9c57f-pqvfv   1/1     Running   1          21h     10.187.0.5      172.18.27.253   <none>           <none>
coredns-677d9c57f-zjf86   1/1     Running   1          4h45m   10.187.1.12     172.18.27.252   <none>           <none>
```

### 排查过程

命令都是在 `172.18.27.252` 上执行的，用 `dig @coredns_svc_ip +short kubernetes.default.svc.cluster1.local` 测发现时而能解析，时而不能解析，然后发现是跨节点的问题。

在 `172.18.27.252` 上去请求 `172.18.27.253` 上的 coredns 的 metrics 接口：

```shell
curl -I 10.187.0.5:9153/metrics
```

然后在 `172.18.27.253` 上抓包：

```shell
$ tcpdump -nn -i flannel.1 host 10.187.0.5 and port 9153
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on flannel.1, link-type EN10MB (Ethernet), capture size 262144 bytes
^C
0 packets captured
0 packets received by filter
0 packets dropped by kernel
```

没有包，在 `172.18.27.253` 上抓了下 `8472` 端口是正常能收包的。像之前的那个文章 [银河麒麟 arm64 系统上 k8s 集群跨节点不通的一次排查](https://zhangguanzhang.github.io/2020/10/20/kylin-v10-k8s-overlay-error/) 看了下，253 机器上查看路由也没问题：

```shell
$ ip route get 10.187.1.0
10.187.1.0 via 10.187.1.0 dev flannel.1 src 10.187.0.0 uid 0
    cache
```

当时各种手段看了个遍，结果有点眉目了（我应该像上篇文章一样先看下 vxlan 的 vtep 信息的。。。）：

```shell
$ kubectl get node -o yaml | grep -A3 Vtep
      flannel.alpha.coreos.com/backend-data: '{"VtepMAC":"fe:22:77:eb:2f:a4"}'
      flannel.alpha.coreos.com/backend-type: vxlan
      flannel.alpha.coreos.com/kube-subnet-manager: "true"
      flannel.alpha.coreos.com/public-ip: 172.18.27.252
--
      flannel.alpha.coreos.com/backend-data: '{"VtepMAC":"fe:22:77:eb:2f:a4"}'
      flannel.alpha.coreos.com/backend-type: vxlan
      flannel.alpha.coreos.com/kube-subnet-manager: "true"
      flannel.alpha.coreos.com/public-ip: 172.18.27.253
--
      flannel.alpha.coreos.com/backend-data: '{"VtepMAC":"fe:22:77:eb:2f:a4"}'
      flannel.alpha.coreos.com/backend-type: vxlan
      flannel.alpha.coreos.com/kube-subnet-manager: "true"
      flannel.alpha.coreos.com/public-ip: 172.18.27.254
```

vtep 的 mac 地址都一样，查看下，发现三台机器都是一样的，看下网卡和 flannel.1 的信息：

```shell
$ ip -4 a s enp1s0
2: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether dc:2d:cb:17:3e:a1 brd ff:ff:ff:ff:ff:ff
    inet 172.18.27.252/25 brd 172.18.27.255 scope global noprefixroute enp1s0
       valid_lft forever preferred_lft forever
$ ip -d link show  flannel.1
394: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN mode DEFAULT group default
    link/ether fe:22:77:eb:2f:a4 brd ff:ff:ff:ff:ff:ff promiscuity 1 minmtu 68 maxmtu 65535
    vxlan id 1 local 172.18.27.252 dev enp1s0 srcport 0 0 dstport 8472 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode none numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
# 另一台机器
$ ip -4 a s enp1s0
2: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether dc:2d:cb:17:3e:86 brd ff:ff:ff:ff:ff:ff
    inet 172.18.27.254/25 brd 172.18.27.255 scope global noprefixroute enp1s0
       valid_lft forever preferred_lft forever
$ ip -d link show flannel.1
66: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN mode DEFAULT group default
    link/ether fe:22:77:eb:2f:a4 brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 1 local 172.18.27.254 dev enp1s0 srcport 0 0 dstport 8472 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode none numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
```

可以看到网卡 enp1s0 的 mac 是不一样的，查看了下几个机器的网卡配置文件的 UUID 和 HWADDR 都不一样。上面命令可以看出只有 flannel.1 的 MAC 是一样，尝试删除然后重启 flanneld 看看重建咋样：

```shell
$ ip link set flannel.1 down
$ ip link set flannel.1 up
$ ip -d link show  flannel.1
4: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN mode DEFAULT group default
    link/ether fe:22:77:eb:2f:a4 brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 1 local 172.18.27.253 dev enp1s0 srcport 0 0 dstport 8472 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode none numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
$ ip link delete flannel.1
$ docker ps -a |grep -m1 flanneld
0aa5998260ba        122cdb7aa710                                "/opt/bin/flanneld -…"    5 hours ago          Up 3 hours                                          k8s_kube-flannel_kube-flannel-ds-2zqr9_kube-system_1ed6eba1-fa30-405e-83d0-314160c25313_1
$ docker restart 0aa
0aa
$ ip -d link show  flannel.1
22: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN mode DEFAULT group default
    link/ether fe:22:77:eb:2f:a4 brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 1 local 172.18.27.253 dev enp1s0 srcport 0 0 dstport 8472 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
```

还是一摸一样，好奇这个 mac 地址如何来的，就去看了下 [flannel 添加 flannel.1 的源码部分](https://github.com/coreos/flannel/blob/v0.11.0/backend/vxlan/vxlan.go#L104-L137)：

```golang
	devAttrs := vxlanDeviceAttrs{
		vni:       uint32(cfg.VNI),
		name:      fmt.Sprintf("flannel.%v", cfg.VNI),
		vtepIndex: be.extIface.Iface.Index,
		vtepAddr:  be.extIface.IfaceAddr,
		vtepPort:  cfg.Port,
		gbp:       cfg.GBP,
	}

	dev, err := newVXLANDevice(&devAttrs)
	if err != nil {
		return nil, err
	}
	dev.directRouting = cfg.DirectRouting

	subnetAttrs, err := newSubnetAttrs(be.extIface.ExtAddr, dev.MACAddr())
```

`dev.MACAddr()` 是直接 return 的 `dev.link.HardwareAddr`，goland 里 find usage 下压根没找到赋值的地方。（可以加代码打印下到底 mac 地址从哪里获取的，但是环境是远程的，得一次一次编译发过去太麻烦了我就没弄了）毫无头绪乱排查了一段时间。然后突发奇想手动按照 vxlan 创建的步骤测试添加下看看：

```shell
$ ip link add test type vxlan id 2 dev enp1s0 local 10.186.0.0 dstport 8473 nolearning
$ ip -d link show test
696: test: <BROADCAST,MULTICAST> mtu 1450 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether ca:32:f1:0d:c6:dc brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 2 local 10.186.0.0 dev enp1s0 srcport 0 0 dstport 8473 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
$ ip link delete test
$ ip link add test type vxlan id 2 dev enp1s0 local 10.186.0.0 dstport 8473 nolearning
$ ip -d link show test
697: test: <BROADCAST,MULTICAST> mtu 1450 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether ca:32:f1:0d:c6:dc brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 2 local 10.186.0.0 dev enp1s0 srcport 0 0 dstport 8473 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535

```

发现手动创建的网络设备 mac 居然也是一样的（实际上 ide 里找上面那个 `HardwareAddr` 的赋值是在引入的一个 `netlink` 包里赋值的，也就是说 flannel 创建接口的时候和手动添加类似，没有直接设置 mac 地址，而是系统返回的），然后同样步骤在我机器上测试是不一样的，看了下客户是啥服务器，发现居然是虚机。

```shell
$ cat /sys/class/dmi/id/product_name
KVM Virtual Machine
```

三台机器上添加接口的 mac 地址都是一样的，机器是不是克隆的？询问了下同事，同事说是的。其实这就是引起故障的根源，应该内部 mac 地址默认是不随机的策略。

查看下网卡策略是咋样的：

```shell
$ networkctl status flannel.1
$ networkctl status enp1s0
```

居然都为空，ubuntu 的机器上是有个优先级低的 link 文件的：

```shell
$ networkctl status enp10s0
● 2: enp10s0
       Link File: /lib/systemd/network/99-default.link
    Network File: n/a
            Type: ether
           State: n/a (unmanaged)
            Path: platform-80040000000.pcie-controller-pci-0000:0a:00.0
          Driver: igb
          Vendor: Intel Corporation
           Model: I210 Gigabit Network Connection
      HW Address: 00:09:06:xx:xx:xx (Esteem Networks)
         Address: 10.226.45.23
                  fe80::209:xxx:xxxx:xxxx
         Gateway: 10.226.45.254
```

一些云主机我看也没这个文件，但是上面添加的接口每次 mac 不一样，应该其他 OS 改了默认的行为。

### 解决方法

我们可以用 systemd 写一个 link 配置文件改变策略：

```shell
cat<<'EOF'>/etc/systemd/network/10-flannel.link
[Match]
OriginalName=flannel*

[Link]
MACAddressPolicy=none
EOF

# 一开始只添加上面的，结果重启后文件没了，下面的文件也追加了下，然后重启还是失效。
# 然后上下两个步骤都整就行了。如果你也遇到了，先单独上面的文件试试，不行再下面的也加上试试。
$ cat<<'EOF'>>/etc/systemd/networkd.conf
[Match]
OriginalName=flannel*

[Link]
MACAddressPolicy=none
EOF
```

确认生效文件

```shell
$ networkctl status flannel.1
● 36: flannel.1                                              
             Link File: /etc/systemd/network/10-flannel.link
          Network File: n/a                                 
                  Type: vxlan                               
                 State: routable (unmanaged)   
                Driver: vxlan                               
            HW Address: fe:22:77:eb:2f:a4                   
                   MTU: 1450 (min: 68, max: 65535)          
                   VNI: 1                                   
                 Local: 172.18.27.252                       
      Destination Port: 8472                                
     Underlying Device: enp1s0                              
  Queue Length (Tx/Rx): 1/1                                 
               Address: 10.187.1.0 
```

再测试下：

```shell
$ ip -d link show flannel.1
4: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN mode DEFAULT group default
    link/ether fe:22:77:eb:2f:a4 brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 1 local 172.18.27.253 dev enp1s0 srcport 0 0 dstport 8472 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
$ ip link delete flannel.1
$ docker ps -a | grep -m1 flanneld
f8759c103131        122cdb7aa710                                   "/opt/bin/flanneld -…"    27 minutes ago      Up 27 minutes                                   k8s_kube-flannel_kube-flannel-ds-85kps_kube-system_127265f3-f3ea-4f89-87e1-aa6c0e0d356f_0
$ docker restart f87
f87
$ ip -d link show flannel.1
36: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN mode DEFAULT group default
    link/ether 1a:e0:cc:e3:a7:04 brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 68 maxmtu 65535
    vxlan id 1 local 172.18.27.253 dev enp1s0 srcport 0 0 dstport 8472 nolearning ttl auto ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
```

果然变了，如果没变尝试把 `none` 改成 `random` 试试。然后每个节点这样操作后，查看下了下 vtep 信息正常了。

```shell
$ kubectl get node -o yaml | grep -A3 Vtep
      flannel.alpha.coreos.com/backend-data: '{"VtepMAC":"9a:1e:00:9d:0c:60"}'
      flannel.alpha.coreos.com/backend-type: vxlan
      flannel.alpha.coreos.com/kube-subnet-manager: "true"
      flannel.alpha.coreos.com/public-ip: 172.18.27.252
--
      flannel.alpha.coreos.com/backend-data: '{"VtepMAC":"1a:e0:cc:e3:a7:04"}'
      flannel.alpha.coreos.com/backend-type: vxlan
      flannel.alpha.coreos.com/kube-subnet-manager: "true"
      flannel.alpha.coreos.com/public-ip: 172.18.27.253
--
      flannel.alpha.coreos.com/backend-data: '{"VtepMAC":"fe:22:77:eb:2f:a4"}'
      flannel.alpha.coreos.com/backend-type: vxlan
      flannel.alpha.coreos.com/kube-subnet-manager: "true"
      flannel.alpha.coreos.com/public-ip: 172.18.27.254
```

测试下跨节点通信：

```shell
$ curl -I 10.187.0.5:9153/metrics
HTTP/1.1 200 OK
Content-Length: 16905
Content-Type: text/plain; version=0.0.4; charset=utf-8
Date: Fri, 06 Nov 2020 01:47:31 GMT
```

### 总结

应该一开始就看下 vtep 信息的，其次应该是 os 的问题，缺少 link 文件。还有这个和 flannel 没关系，只要用到 Linux 自带的 vxlan 接口在这种场景上都会出现，例如 calico 新版本也有 vxlan 模式。

## 参考文档

- [systemd link](http://www.jinbuguo.com/systemd/systemd.link.html)
