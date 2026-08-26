variable "region" {
  default     = "us-east-1"
  type        = string
  description = "region for the infra"
}

variable "vpc_cidr" {
  default     = "10.0.0.0/16"
  type        = string
  description = "CIDR block for the VPC"
}

variable "public_subnet_cidr" {
  default     = "10.0.1.0/24"
  type        = string
  description = "CIDR block for the public subnet"
}

variable "availability_zone" {
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
  type        = list(string)
  description = "availability zone for subnets"
}

variable "private_subnet_cidrs" {
  default     = ["10.0.2.0/24", "10.0.3.0/24"]
  type        = list(string)
  description = "cidrs for private subnets"
}

variable "control_node_instance_type" {
  default     = "c7i-flex.large"
  type        = string
  description = "instance type of control node"
}

variable "worker_node_instance_type" {
  default     = "t3.small"
  type        = string
  description = "instance type of worker node"
}

variable "instance_ami_id" {
  default     = "ami-0b6d9d3d33ba97d99"
  type        = string
  description = "Ubuntu Server AMI ID"
}

variable "db_username" {
  default     = "prem"
  type        = string
  description = "username for database."
}

variable "db_password" {
  sensitive   = true
  type        = string
  description = "password of database."
}

variable "db_instance_type" {
  default     = "db.t3.micro"
  type        = string
  description = "instance type of database."
}

variable "db_storage_type" {
  default     = "gp3"
  type        = string
  description = "storage type of database."
}

variable "storage_for_db" {
  default     = 20
  type        = number
  description = "storage of database."
}
