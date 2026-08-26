resource "aws_vpc" "notesvpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "notes_vpc"
  }
}

resource "aws_internet_gateway" "notes_ig" {
  vpc_id = aws_vpc.notesvpc.id
  tags = {
    Name = "notes_ig"
  }
}

resource "aws_subnet" "notes_public_subnet" {
  vpc_id                  = aws_vpc.notesvpc.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = var.availability_zone[0]
  tags = {
    Name = "notes_public_subnet"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.notesvpc.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zone[count.index + 1]
  tags              = { Name = "cloudnotes-private-subnet-${count.index + 1}" }
}

resource "aws_route_table" "notes_public_rt" {
  vpc_id = aws_vpc.notesvpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.notes_ig.id
  }
  tags = {
    Name = "public-route-table"
  }
}

resource "aws_route_table" "notes_private_rt" {
  vpc_id = aws_vpc.notesvpc.id
  tags = {
    Name = "private-route-table"
  }
}

resource "aws_route_table_association" "notes_public_rta" {
  subnet_id      = aws_subnet.notes_public_subnet.id
  route_table_id = aws_route_table.notes_public_rt.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.notes_private_rt.id
}

resource "aws_security_group" "ec2_sg" {
  name        = "ec2-sg"
  description = "Security Group for EC2"
  vpc_id      = aws_vpc.notesvpc.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Kubernetes API server (kubeadm join, kubectl)"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    self        = true
  }
  ingress {
    description = "Kubelet API (control-plane to node, kubectl logs/exec)"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    self        = true
  }
  ingress {
    description = "Flannel VXLAN overlay (cross-node pod networking)"
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    self        = true
  }
  ingress {
    description = "NodePort access for app (external)"
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "ec2-sg"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "rds-sg"
  description = "Security Group for RDS"
  vpc_id      = aws_vpc.notesvpc.id

  ingress {
    description     = "MySQL from EC2"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rds-sg"
  }
}