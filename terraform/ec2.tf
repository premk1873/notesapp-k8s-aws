resource "aws_key_pair" "cloudnotes_key" {
  key_name   = "cloudnotes-key"
  public_key = file("/home/prem/.ssh/cloudnotes-key.pub")
}

resource "aws_instance" "control_node" {
  ami                    = var.instance_ami_id
  instance_type          = var.control_node_instance_type
  subnet_id              = aws_subnet.notes_public_subnet.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  key_name               = aws_key_pair.cloudnotes_key.key_name
  tags = {
    Name = "Control-Node"
  }
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }
}

resource "aws_instance" "worker_node" {
  ami                    = var.instance_ami_id
  instance_type          = var.worker_node_instance_type
  subnet_id              = aws_subnet.notes_public_subnet.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  key_name               = aws_key_pair.cloudnotes_key.key_name
  tags = {
    Name = "Worker-Node"
  }
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }
}
