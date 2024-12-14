#nullable enable

using System;
using System.Runtime.Serialization;

namespace GitWebLinks;

[Serializable]
public class GitException : Exception {

    public GitException(string message) : base(message) { }


    protected GitException(SerializationInfo info, StreamingContext context) : base(info, context) { }

}
