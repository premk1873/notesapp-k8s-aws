output "control_node_public_ip" {
  value = aws_instance.control_node.public_ip
}

output "worker_node_public_ip" {
  value = aws_instance.worker_node.public_ip
}

output "rds_endpoint" {
  value = aws_db_instance.cloudnotes_db.endpoint
}